const randomInt = (min, max) =>
  min + Math.floor(Math.random() * (max - min + 1));
const matrixTex = (rows, environment = "pmatrix") =>
  `\\begin{${environment}}${rows.map((row) => row.join("&")).join("\\\\")}\\end{${environment}}`;
const signedTerm = (value, suffix = "") =>
  value < 0 ? `${value}${suffix}` : `+${value}${suffix}`;

function makeMatrix(size, level) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () =>
      randomInt(level === 1 ? 1 : -3 * level, 3 * level + 3),
    ),
  );
}

function matrix(level) {
  const left = makeMatrix(2, level);
  const right = makeMatrix(2, level);
  const scalar = randomInt(2, 5) * (Math.random() < 0.5 ? -1 : 1);
  const prompts = [
    "Сложите матрицы. Введите две строки по два элемента.",
    "Умножьте матрицу на указанное число.",
    "Найдите произведение матриц в указанном порядке.",
  ];
  const formula = [
    `${matrixTex(left)}+${matrixTex(right)}`,
    `${matrixTex(left)}\\cdot (${scalar})`,
    `${matrixTex(left)}\\cdot ${matrixTex(right)}`,
  ][level - 1];
  const steps = [];
  const solution = left.flatMap((row, i) =>
    row.map((value, j) => {
      const firstProduct = row[0] * right[0][j];
      const secondProduct = row[1] * right[1][j];
      const answer = [
        value + right[i][j],
        value * scalar,
        firstProduct + secondProduct,
      ][level - 1];
      const expression = [
        `${value} + (${right[i][j]})`,
        `${value} · (${scalar})`,
        `${row[0]} · (${right[0][j]}) + ${row[1]} · (${right[1][j]})`,
      ][level - 1];
      steps.push(
        `Элемент строки ${i + 1}, столбца ${j + 1}: ${expression} = ${answer}.`,
      );
      return answer;
    }),
  );
  const methods = [
    "Сложите элементы, которые стоят в одной строке и одном столбце.",
    "Умножьте каждый элемент матрицы на указанное число.",
    "Умножьте элементы строки первой матрицы на соответствующие элементы столбца второй и сложите произведения.",
  ];
  return {
    kind: "matrix",
    prompt: prompts[level - 1],
    formula,
    solution,
    steps,
    hints: ["Проверьте размеры матриц.", methods[level - 1]],
  };
}

function determinant(level) {
  const prompt = "Вычислите определитель матрицы.";
  const rows = makeMatrix(level === 3 ? 3 : 2, level);
  if (level < 3) {
    const [[a, b], [c, d]] = rows;
    const solution = a * d - b * c;
    return {
      prompt,
      formula: `\\det ${matrixTex(rows)}`,
      solution,
      steps: [`(${a}) · (${d}) − (${b}) · (${c}) = ${solution}.`],
      hints: [
        "Начните с главной диагонали.",
        "Из произведения элементов главной диагонали вычтите произведение элементов побочной.",
      ],
    };
  }
  const [[a, b, c], [d, e, f], [g, h, i]] = rows;
  const minors = [e * i - f * h, d * i - f * g, d * h - e * g];
  const solution = a * minors[0] - b * minors[1] + c * minors[2];
  return {
    prompt,
    formula: matrixTex(rows, "vmatrix"),
    solution,
    steps: [
      `Миноры: ${minors.join(", ")}.`,
      `Разложение: (${a}) · (${minors[0]}) − (${b}) · (${minors[1]}) + (${c}) · (${minors[2]}) = ${solution}.`,
    ],
    hints: [
      "Разложите по первой строке.",
      "Вычислите три минора 2 × 2. Используйте знаки плюс, минус, плюс.",
    ],
  };
}

function derivative(level) {
  const point = randomInt(-3, 3);
  const coefficient = randomInt(1, 6);
  const constant = randomInt(-5, 5);
  const power = randomInt(2, level + 3);
  const chainRule = level === 3;
  const linear = level === 2 ? constant || 1 : 0;
  const formula = chainRule
    ? `f(x)=(${coefficient}x${signedTerm(constant || 1)})^{${power}}`
    : `f(x)=${coefficient}x^{${power}}${linear ? signedTerm(linear, "x") : ""}`;
  const base = chainRule ? coefficient * point + (constant || 1) : point;
  const solution = power * coefficient * base ** (power - 1) + linear;
  const rule = chainRule
    ? `Производная внешней степени даёт множитель ${power}, производная внутренней функции даёт ${coefficient}.`
    : `Коэффициент производной степенного члена: ${coefficient} · ${power} = ${coefficient * power}.`;
  return {
    prompt: `Найдите значение производной в точке x = ${point}.`,
    formula,
    solution,
    steps: [rule, `Подставляем ${point}: получаем ${solution}.`],
    hints: [
      "Сначала найдите производную, затем подставьте точку.",
      chainRule
        ? "Примените правило цепочки."
        : "Умножьте коэффициент на показатель степени и уменьшите степень на единицу.",
    ],
  };
}

function integral(level) {
  const lower = level === 1 ? 0 : randomInt(-3, 1);
  const upper = randomInt(Math.max(lower + 1, 1), level + 2);
  const coefficient = randomInt(1, 6);
  const power = randomInt(level === 3 ? 2 : 1, level === 3 ? 4 : 2);
  const nextPower = power + 1;
  const high = upper ** nextPower;
  const low = lower ** nextPower;
  return {
    prompt: "Вычислите определённый интеграл. Допустим ответ дробью.",
    formula: `\\int_{${lower}}^{${upper}} ${coefficient}x^{${power}}\\,dx`,
    solution: (coefficient * (high - low)) / nextPower,
    steps: [
      `Первообразная: коэффициент ${coefficient}/${nextPower}, степень ${nextPower}.`,
      `Верхняя граница минус нижняя: ${coefficient} · (${high} − (${low})) / ${nextPower}.`,
    ],
    hints: [
      "Найдите первообразную степенной функции.",
      "Подставьте обе границы в первообразную и вычтите значение на нижней границе из значения на верхней.",
    ],
  };
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function sets(level) {
  const makeSet = () =>
    uniqueSorted(
      Array.from({ length: randomInt(3, 5) }, () =>
        randomInt(level === 1 ? 1 : -5, level === 1 ? 6 : 9),
      ),
    );
  const a = makeSet();
  const b = makeSet();
  const solution = [
    uniqueSorted([...a, ...b]),
    a.filter((item) => b.includes(item)),
    a.filter((item) => !b.includes(item)),
  ][level - 1];
  const operation = ["\\cup", "\\cap", "\\setminus"][level - 1];
  const method = [
    "Возьмите элементы из обоих множеств.",
    "Оставьте только общие элементы.",
    "Оставьте элементы A, которых нет в B.",
  ][level - 1];
  return {
    kind: "set",
    prompt: "Выполните операцию. Введите элементы через запятую или ∅.",
    formula: `A=\\{${a.join(",")}\\},\\quad B=\\{${b.join(",")}\\},\\quad A${operation} B=?`,
    solution,
    steps: [
      `${method} Результат: ${solution.length ? `{${solution.join(", ")}}` : "∅"}.`,
    ],
    hints: ["Повторяющиеся элементы записывают один раз.", method],
  };
}

function logic(level) {
  const p = randomInt(0, 1);
  const q = randomInt(0, 1);
  const r = randomInt(0, 1);
  const implication = Number(!p || !!q);
  const disjunction = Number(!q || !!r);
  const solution = [p * q, implication, implication * disjunction][level - 1];
  const formula = [
    "p\\land q",
    "p\\Rightarrow q",
    "(p\\Rightarrow q)\\land(\\neg q\\lor r)",
  ][level - 1];
  const steps = [`Значение всего выражения: ${solution}.`];
  if (level > 1) steps.unshift(`Значение p → q: ${implication}.`);
  if (level === 3) steps.splice(1, 0, `Значение ¬q ∨ r: ${disjunction}.`);
  return {
    prompt: `Вычислите истинность при p = ${p}, q = ${q}${level === 3 ? `, r = ${r}` : ""}. Ответ: 0 или 1.`,
    formula,
    solution,
    steps,
    hints: [
      "Вычисляйте выражение по скобкам.",
      level === 1
        ? "Конъюнкция истинна, только когда оба высказывания истинны."
        : "Импликация ложна только при истинной посылке и ложном заключении.",
    ],
  };
}

function combinations(level) {
  const students = randomInt(5 + level, 8 + 3 * level);
  const team = randomInt(2, level + 3);
  const fixed = level === 3 ? 1 : 0;
  const n = students - fixed;
  const k = team - fixed;
  let solution = 1;
  for (let i = 1; i <= k; i++) solution = (solution * (n - i + 1)) / i;
  return {
    prompt: fixed
      ? `Из ${students} студентов выбирают команду. Размер команды — ${team}. Один конкретный студент обязательно должен войти. Сколько вариантов?`
      : `Из ${students} студентов выбирают команду. Размер команды — ${team}. Порядок не важен. Сколько вариантов?`,
    formula: `C_{${n}}^{${k}}`,
    solution,
    steps: [
      `Выбираем ${k} из ${n}.`,
      `По формуле сочетаний получаем ${solution}.`,
    ],
    hints: [
      "Порядок участников не важен — используйте сочетания.",
      fixed
        ? "Место обязательного участника уже занято. Посчитайте, как выбрать остальных."
        : "Разделите произведение k убывающих множителей, начиная с n, на k!.",
    ],
  };
}

function tree(level) {
  const vertices = randomInt(4 + level, 7 + 8 * level);
  const components = level === 2 ? randomInt(2, 5) : 1;
  const edges = vertices - components;
  const solution = level === 3 ? 2 * edges : edges;
  const prompt = [
    `Сколько рёбер в дереве с ${vertices} вершинами?`,
    `В лесе ${vertices} вершин. Число компонент связности — ${components}. Сколько рёбер?`,
    `Чему равна сумма степеней всех вершин дерева с ${vertices} вершинами?`,
  ][level - 1];
  return {
    prompt,
    formula: ["|E|=|V|-1", "|E|=|V|-c", "\\sum\\deg(v)=2|E|"][level - 1],
    solution,
    steps: [
      level === 3
        ? `2 · (${vertices} − 1) = ${solution}.`
        : `${vertices} − ${components} = ${solution}.`,
    ],
    hints: [
      "Для каждого дерева рёбер на одно меньше, чем вершин.",
      [
        "Вычтите единицу из числа вершин.",
        "Вычтите из числа вершин число компонент связности.",
        "Каждое ребро увеличивает сумму степеней на два.",
      ][level - 1],
    ],
  };
}

const generators = new Map([
  ["matrix", matrix],
  ["det", determinant],
  ["derivative", derivative],
  ["integral", integral],
  ["sets", sets],
  ["logic", logic],
  ["comb", combinations],
  ["tree", tree],
]);

export function isTopic(topic) {
  return generators.has(topic);
}

export function createTask(topic, level) {
  if (!isTopic(topic) || ![1, 2, 3].includes(level)) {
    throw Error("Выберите доступную тему и сложность.");
  }
  return {
    id: crypto.randomUUID(),
    topic,
    level,
    kind: "number",
    ...generators.get(topic)(level),
  };
}

function normalize(input) {
  return input
    .replaceAll("−", "-")
    .replaceAll("\\left", "")
    .replaceAll("\\right", "")
    .replaceAll("\\mleft", "")
    .replaceAll("\\mright", "")
    .replace(/\\[,;! ]/g, "")
    .replace(/\\(?:dfrac|tfrac)/g, "\\frac")
    .trim();
}

function numberValue(input) {
  const text = normalize(input)
    .replace(/\s/g, "")
    .replaceAll("{,}", ",")
    .replaceAll(",", ".");
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return Number(text);
  const tex = text.match(/^([+-]?)\\frac\{([^{}]+)\}\{([^{}]+)\}$/);
  const fraction = text.match(/^([^/]+)\/([^/]+)$/);
  if (!tex && !fraction) return NaN;
  const numerator = numberValue(tex ? tex[2] : fraction[1]);
  const denominator = numberValue(tex ? tex[3] : fraction[2]);
  return ((tex?.[1] === "-" ? -1 : 1) * numerator) / denominator;
}

function closeEnough(actual, expected) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-7;
}

export function matchesAnswer(task, input) {
  const text = normalize(input);
  if (!text) return false;
  if (task.kind === "number")
    return closeEnough(numberValue(text), task.solution);
  if (task.kind === "matrix") {
    const tex = text.match(
      /^\\begin\{([pbvBV]?matrix|array|smallmatrix)\}(.*)\\end\{\1\}$/s,
    );
    const rows = tex
      ? tex[2]
          .replace(/^\{[lcr |]+\}/, "")
          .split("\\\\")
          .map((row) => row.split("&"))
      : text.split(/;|\n/).map((row) => row.trim().split(/\s*,\s*|\s+/));
    return (
      rows.length === 2 &&
      rows.every((row) => row.length === 2) &&
      rows
        .flat()
        .every((entry, index) =>
          closeEnough(numberValue(entry), task.solution[index]),
        )
    );
  }
  if (
    ["∅", "\\emptyset", "\\varnothing", "{}", "\\{\\}"].includes(
      text.replace(/\s/g, ""),
    )
  ) {
    return task.solution.length === 0;
  }
  const entries = text
    .replace(/^(?:\\)?\{\s*|\s*(?:\\)?\}$/g, "")
    .split(/[,;]/)
    .map(numberValue);
  if (!entries.every(Number.isFinite)) return false;
  const values = uniqueSorted(entries);
  return (
    values.length === task.solution.length &&
    values.every((value, index) => closeEnough(value, task.solution[index]))
  );
}
