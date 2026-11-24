import { createTask, isTopic, matchesAnswer } from "./tasks.js";

const storageKey = "mathwiz-university/learning/v1";

function readProfile() {
  try {
    const profile = JSON.parse(localStorage.getItem(storageKey));
    if (
      profile?.id &&
      profile.preferences &&
      profile.practice &&
      profile.exams &&
      profile.attempts
    )
      return profile;
  } catch {
    // Recover from an unreadable profile with a new guest session.
  }
  return {
    id: crypto.randomUUID(),
    preferences: {},
    practice: {},
    exams: {},
    attempts: [],
  };
}

function publicTask({ id, topic, level, kind, prompt, formula }) {
  return { id, topic, level, kind, prompt, formula };
}

function publicExam(exam) {
  return {
    ...exam,
    data: { ...exam.data, tasks: exam.data.tasks.map(publicTask) },
  };
}

function summary(profile) {
  const { id, preferences, attempts, exams } = profile;
  return {
    guest: id.slice(0, 8),
    data: preferences,
    attempts,
    xp: attempts.reduce((sum, attempt) => sum + (attempt.correct ? 10 : 2), 0),
    history: Object.values(exams)
      .sort((a, b) => b.created - a.created)
      .map(publicExam),
  };
}

function recordAttempt(profile, task, answer, correct) {
  profile.attempts.push({
    id: task.id,
    topic: task.topic,
    level: task.level,
    created: Date.now(),
    answer,
    correct: Number(correct),
  });
}

function practiceTask(profile, id) {
  const task = Object.hasOwn(profile.practice, id) && profile.practice[id];
  if (!task)
    throw Error("Срок действия задания истёк. Создайте новый вариант.");
  return task;
}

function getExam(profile, id) {
  const exam = Object.hasOwn(profile.exams, id) && profile.exams[id];
  if (!exam) throw Error("Контрольная не найдена в этом браузере.");
  return exam;
}

function createExam(profile, fields) {
  const { topics, count, level, mode, minutes } = fields;
  if (
    !topics.length ||
    !topics.every(isTopic) ||
    ![1, 2, 3].includes(level) ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 30 ||
    !["training", "exam"].includes(mode)
  ) {
    throw Error("Проверьте темы, сложность и число заданий.");
  }
  if (
    mode === "exam" &&
    (!Number.isInteger(minutes) || minutes < 5 || minutes > 180)
  ) {
    throw Error("Укажите время от 5 до 180 минут.");
  }
  const id = crypto.randomUUID();
  const created = Date.now();
  const exam = {
    id,
    created,
    finished: null,
    deadline: mode === "exam" ? created + 60000 * minutes : null,
    data: {
      mode,
      level,
      topics,
      drafts: {},
      flags: [],
      tasks: Array.from({ length: count }, (_, index) =>
        createTask(topics[index % topics.length], level),
      ),
    },
  };
  profile.exams[id] = exam;
  return publicExam(exam);
}

function finishExam(profile, exam) {
  if (exam.finished) return publicExam(exam);
  const { tasks, drafts } = exam.data;
  const results = tasks.map((task) => {
    const answer = drafts[task.id] ?? "";
    const correct = matchesAnswer(task, answer);
    if (answer.trim()) recordAttempt(profile, task, answer, correct);
    return {
      ...publicTask(task),
      answer,
      correct,
      solution: task.solution,
      steps: task.steps,
    };
  });
  const correct = results.filter((task) => task.correct).length;
  const percent = Math.round((100 * correct) / results.length);
  const grade = percent >= 90 ? 5 : percent >= 75 ? 4 : percent >= 50 ? 3 : 2;
  exam.finished = Date.now();
  exam.data.result = {
    correct,
    total: results.length,
    percent,
    grade,
    tasks: results,
  };
  return publicExam(exam);
}

function runAction(profile, action, fields) {
  switch (action) {
    case "init":
      return summary(profile);
    case "preferences": {
      for (const key of ["last", "read", "favorites"]) {
        if (Object.hasOwn(fields, key)) profile.preferences[key] = fields[key];
      }
      return summary(profile);
    }
    case "task": {
      const task = createTask(fields.topic, fields.level);
      profile.practice[task.id] = task;
      const older = Object.keys(profile.practice).slice(0, -50);
      for (const id of older) delete profile.practice[id];
      return publicTask(task);
    }
    case "hint": {
      const task = practiceTask(profile, fields.id);
      task.hintLevel = Math.min((task.hintLevel ?? 0) + 1, 3);
      return task.hintLevel < 3
        ? { level: task.hintLevel, text: task.hints[task.hintLevel - 1] }
        : {
            level: 3,
            text: task.steps.join(" "),
            solution:
              task.kind === "set" && !task.solution.length
                ? "∅"
                : task.solution,
          };
    }
    case "answer": {
      const task = practiceTask(profile, fields.id);
      const correct = matchesAnswer(task, fields.answer);
      const first = !task.answered;
      if (first) {
        recordAttempt(profile, task, fields.answer, correct);
        task.answered = true;
      }
      return { correct, first, steps: task.steps, answer: task.solution };
    }
    case "exam_create":
      return createExam(profile, fields);
    case "exam_get":
      return publicExam(getExam(profile, fields.id));
    case "exam_save": {
      const exam = getExam(profile, fields.id);
      if (exam.finished) return publicExam(exam);
      if (exam.deadline && Date.now() >= exam.deadline)
        throw Error("Время вышло. Завершите контрольную.");
      exam.data.drafts = fields.drafts;
      exam.data.flags = fields.flags;
      return publicExam(exam);
    }
    case "exam_finish":
      return finishExam(profile, getExam(profile, fields.id));
    default:
      throw Error("Неизвестное действие.");
  }
}

export async function learn(action, fields = {}) {
  function useProfile() {
    if (action === "delete") {
      localStorage.removeItem(storageKey);
      return;
    }
    const profile = readProfile();
    const result = runAction(profile, action, fields);
    localStorage.setItem(storageKey, JSON.stringify(profile));
    return result;
  }

  return navigator.locks
    ? navigator.locks.request(storageKey, useProfile)
    : useProfile();
}
