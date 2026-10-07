import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./App.css";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getCategoryIcon = (category) => {
  const icons = {
    Food: "🍔",
    Transport: "🚗",
    Shopping: "🛍️",
    Bills: "💡",
    Education: "📚",
    Other: "📦",
  };

  return icons[category] || "📦";
};

function App() {
  const [salary, setSalary] = useState(() => {
    const savedSalary = localStorage.getItem("expenseTrackerSalary");
    return savedSalary ? Number(savedSalary) : 0;
  });

  const [salaryInput, setSalaryInput] = useState("");

  const [expenses, setExpenses] = useState(() => {
    try {
      const savedExpenses = localStorage.getItem(
        "expenseTrackerExpenses"
      );

      return savedExpenses ? JSON.parse(savedExpenses) : [];
    } catch {
      return [];
    }
  });

  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "Food",
    date: "",
  });

  const [error, setError] = useState("");
  const [salaryError, setSalaryError] = useState("");
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const titleInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(
      "expenseTrackerSalary",
      salary.toString()
    );
  }, [salary]);

  useEffect(() => {
    localStorage.setItem(
      "expenseTrackerExpenses",
      JSON.stringify(expenses)
    );
  }, [expenses]);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  const handleSalarySubmit = useCallback(
    (event) => {
      event.preventDefault();

      const amount = Number(salaryInput);

      if (!salaryInput || amount <= 0) {
        setSalaryError(
          "Please enter a salary greater than 0."
        );
        return;
      }

      setSalary(amount);
      setSalaryInput("");
      setSalaryError("");
    },
    [salaryInput]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();

      if (
        !formData.title.trim() ||
        !formData.amount ||
        !formData.date
      ) {
        setError(
          "Please complete the expense name, amount and date."
        );
        return;
      }

      if (Number(formData.amount) <= 0) {
        setError("Amount must be greater than 0.");
        return;
      }

      const newExpense = {
        id: Date.now(),
        title: formData.title.trim(),
        amount: Number(formData.amount),
        category: formData.category,
        date: formData.date,
      };

      setExpenses((previous) => [
        newExpense,
        ...previous,
      ]);

      setFormData({
        title: "",
        amount: "",
        category: "Food",
        date: "",
      });

      setError("");

      titleInputRef.current?.focus();
    },
    [formData]
  );

  const handleDelete = useCallback((id) => {
    setExpenses((previous) =>
      previous.filter(
        (expense) => expense.id !== id
      )
    );
  }, []);

  const totalExpenses = useMemo(() => {
    return expenses.reduce(
      (total, expense) =>
        total + Number(expense.amount),
      0
    );
  }, [expenses]);

  const expenseCount = expenses.length;

  const highestExpense = useMemo(() => {
    if (!expenses.length) return 0;

    return Math.max(
      ...expenses.map((expense) =>
        Number(expense.amount)
      )
    );
  }, [expenses]);

  const remainingBalance = useMemo(() => {
    return salary - totalExpenses;
  }, [salary, totalExpenses]);

  const spentPercentage = useMemo(() => {
    if (salary <= 0) return 0;

    return Math.min(
      (totalExpenses / salary) * 100,
      100
    );
  }, [salary, totalExpenses]);

  const remainingPercentage = useMemo(() => {
    if (salary <= 0) return 0;

    return Math.max(
      ((salary - totalExpenses) / salary) * 100,
      0
    );
  }, [salary, totalExpenses]);

  const categoryTotals = useMemo(() => {
    return expenses.reduce((result, expense) => {
      if (!result[expense.category]) {
        result[expense.category] = 0;
      }

      result[expense.category] += Number(
        expense.amount
      );

      return result;
    }, {});
  }, [expenses]);

  const chartData = useMemo(() => {
    if (!expenses.length) return [];

    const grouped = {};

    expenses.forEach((expense) => {
      if (!grouped[expense.date]) {
        grouped[expense.date] = 0;
      }

      grouped[expense.date] += Number(
        expense.amount
      );
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, amount]) => ({
        date,
        amount,
        label: new Date(
          `${date}T00:00:00`
        ).toLocaleDateString("en-PK", {
          day: "numeric",
          month: "short",
        }),
      }));
  }, [expenses]);

  const graphMax = useMemo(() => {
    if (!chartData.length) return 100;

    const highest = Math.max(
      ...chartData.map((item) => item.amount)
    );

    if (highest <= 1000) {
      return Math.ceil(highest / 250) * 250 || 250;
    }

    if (highest <= 10000) {
      return Math.ceil(highest / 1000) * 1000;
    }

    return Math.ceil(highest / 5000) * 5000;
  }, [chartData]);

  const graphPoints = useMemo(() => {
    if (!chartData.length) return [];

    const width = 760;
    const height = 230;
    const paddingX = 25;
    const paddingY = 20;

    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;

    return chartData.map((item, index) => {
      const x =
        chartData.length === 1
          ? width / 2
          : paddingX +
            (index /
              (chartData.length - 1)) *
              usableWidth;

      const y =
        paddingY +
        usableHeight -
        (item.amount / graphMax) *
          usableHeight;

      return {
        ...item,
        x,
        y,
      };
    });
  }, [chartData, graphMax]);

  const linePath = useMemo(() => {
    if (!graphPoints.length) return "";

    return graphPoints
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
      )
      .join(" ");
  }, [graphPoints]);

  const areaPath = useMemo(() => {
    if (!graphPoints.length) return "";

    const first = graphPoints[0];
    const last =
      graphPoints[graphPoints.length - 1];

    return `${linePath} L ${last.x} 250 L ${first.x} 250 Z`;
  }, [graphPoints, linePath]);

  const budgetStatus = useMemo(() => {
    if (salary <= 0) {
      return {
        title: "Set your salary",
        text:
          "Add your monthly salary to start tracking your budget.",
      };
    }

    if (remainingBalance < 0) {
      return {
        title: "Budget exceeded",
        text: `You are ${formatCurrency(
          Math.abs(remainingBalance)
        )} over your monthly salary.`,
      };
    }

    if (spentPercentage >= 80) {
      return {
        title: "Budget getting low",
        text:
          "You have used more than 80% of your monthly salary.",
      };
    }

    if (spentPercentage >= 60) {
      return {
        title: "Watch your spending",
        text:
          "You have used more than 60% of your monthly salary.",
      };
    }

    return {
      title: "You're doing great",
      text: `${remainingPercentage.toFixed(
        0
      )}% of your salary is still available.`,
    };
  }, [
    salary,
    remainingBalance,
    spentPercentage,
    remainingPercentage,
  ]);

  return (
    <div className="app">

      {/* HEADER */}

      <header className="header">
        <div className="brand">
          <div className="brand-icon">₹</div>

          <div>
            <span className="brand-small">
              PERSONAL FINANCE
            </span>

            <h1>Expense Tracker</h1>

            <p>
              Simple. Smart. Secure.
            </p>
          </div>
        </div>

        <div className="header-status">
          <span></span>
          Data saved locally
        </div>
      </header>

      <main className="container">

        {/* HERO */}

        <section className="hero">

          <div className="hero-text">
            <span className="hero-label">
              PERSONAL FINANCE DASHBOARD
            </span>

            <h2>
              Take control
              <br />
              of your money.
            </h2>

            <p>
              Track your salary, expenses and
              spending habits in one beautiful
              dashboard.
            </p>
          </div>

          <div className="balance-card">

            <div className="balance-top">
              <span>TOTAL BALANCE</span>

              <b>
                {remainingBalance >= 0
                  ? "AVAILABLE"
                  : "OVER BUDGET"}
              </b>
            </div>

            <strong>
              {formatCurrency(remainingBalance)}
            </strong>

            <div className="balance-bottom">
              <span>
                Monthly salary
              </span>

              <b>
                {formatCurrency(salary)}
              </b>
            </div>

          </div>
        </section>

        {/* SALARY */}

        <section className="salary-section">

          <div className="salary-heading">

            <div className="salary-icon">
              ₹
            </div>

            <div>
              <span>
                MONTHLY INCOME
              </span>

              <h2>
                {salary
                  ? formatCurrency(salary)
                  : "No salary set"}
              </h2>

              <p>
                Set your monthly salary
                to calculate your budget.
              </p>
            </div>

          </div>

          <form
            className="salary-form"
            onSubmit={handleSalarySubmit}
          >

            <div className="salary-input">
              <span>₹</span>

              <input
                type="number"
                value={salaryInput}
                onChange={(e) =>
                  setSalaryInput(e.target.value)
                }
                placeholder="Enter salary"
                min="1"
              />
            </div>

            <button type="submit">
              Update Salary
            </button>

          </form>

        </section>

        {salaryError && (
          <div className="salary-error-box">
            {salaryError}
          </div>
        )}

        {/* SUMMARY */}

        <section className="section-title">

          <div>
            <span>YOUR FINANCES</span>

            <h2>Financial Overview</h2>
          </div>

          <div className="live">
            ● LIVE
          </div>

        </section>

        <section className="summary-grid">

          <div className="summary-card navy-card">

            <span>TOTAL INCOME</span>

            <h2>
              {formatCurrency(salary)}
            </h2>

            <div className="summary-bottom">
              <span>Monthly salary</span>
              <b>INCOME</b>
            </div>

          </div>

          <div className="summary-card orange-card">

            <span>TOTAL EXPENSES</span>

            <h2>
              {formatCurrency(totalExpenses)}
            </h2>

            <div className="summary-bottom">
              <span>{expenseCount} transactions</span>
              <b>SPENT</b>
            </div>

          </div>

          <div className="summary-card white-card">

            <span>REMAINING</span>

            <h2 className={
              remainingBalance < 0
                ? "danger-text"
                : "navy-text"
            }>
              {formatCurrency(remainingBalance)}
            </h2>

            <div className="summary-bottom">
              <span>
                {remainingPercentage.toFixed(0)}% available
              </span>

              <b>
                BALANCE
              </b>
            </div>

          </div>

        </section>

        {/* QUICK STATS */}

        <section className="quick-grid">

          <div className="quick-card">
            <div className="quick-icon orange-icon">
              ↗
            </div>

            <div>
              <span>SPENDING</span>
              <strong>
                {spentPercentage.toFixed(0)}%
              </strong>
            </div>
          </div>

          <div className="quick-card">
            <div className="quick-icon navy-icon">
              #
            </div>

            <div>
              <span>TRANSACTIONS</span>
              <strong>
                {expenseCount}
              </strong>
            </div>
          </div>

          <div className="quick-card">
            <div className="quick-icon orange-icon">
              ↑
            </div>

            <div>
              <span>HIGHEST EXPENSE</span>
              <strong>
                {formatCurrency(highestExpense)}
              </strong>
            </div>
          </div>

        </section>

        {/* GRAPH */}

        <section className="graph-section">

          <div className="graph-header">

            <div>
              <span>
                SPENDING ACTIVITY
              </span>

              <h2>
                Expense Trend
              </h2>

              <p>
                Your latest spending activity
              </p>
            </div>

            <div className="graph-total">
              <span>
                TOTAL SPENT
              </span>

              <strong>
                {formatCurrency(totalExpenses)}
              </strong>
            </div>

          </div>

          {graphPoints.length > 0 ? (
            <div className="professional-chart">

              <div className="chart-y-axis">
                <span>
                  {formatCurrency(graphMax)}
                </span>

                <span>
                  {formatCurrency(graphMax * 0.75)}
                </span>

                <span>
                  {formatCurrency(graphMax * 0.5)}
                </span>

                <span>
                  {formatCurrency(graphMax * 0.25)}
                </span>

                <span>₹0</span>
              </div>

              <div className="chart-main">

                <div className="chart-grid-lines">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <svg
                  className="expense-chart"
                  viewBox="0 0 760 250"
                  preserveAspectRatio="none"
                >

                  <defs>
                    <linearGradient
                      id="areaGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#ff641d"
                        stopOpacity="0.35"
                      />

                      <stop
                        offset="100%"
                        stopColor="#ff641d"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  <path
                    d={areaPath}
                    className="chart-area"
                  />

                  <path
                    d={linePath}
                    className="chart-line"
                  />

                  {graphPoints.map(
                    (point, index) => (
                      <circle
                        key={point.date}
                        cx={point.x}
                        cy={point.y}
                        r="6"
                        className="chart-point"
                        onMouseEnter={() =>
                          setHoveredPoint(index)
                        }
                        onMouseLeave={() =>
                          setHoveredPoint(null)
                        }
                      />
                    )
                  )}

                </svg>

                {hoveredPoint !== null && (
                  <div
                    className="chart-tooltip"
                    style={{
                      left: `${
                        (graphPoints[hoveredPoint].x /
                          760) *
                        100
                      }%`,
                      top: `${
                        (graphPoints[hoveredPoint].y /
                          250) *
                        100
                      }%`,
                    }}
                  >
                    <span>
                      {graphPoints[hoveredPoint].label}
                    </span>

                    <strong>
                      {formatCurrency(
                        graphPoints[hoveredPoint].amount
                      )}
                    </strong>
                  </div>
                )}

                <div className="chart-x-axis">
                  {graphPoints.map((point) => (
                    <span key={point.date}>
                      {point.label}
                    </span>
                  ))}
                </div>

              </div>
            </div>
          ) : (
            <div className="graph-empty">
              <div>⌁</div>

              <h3>
                No spending data yet
              </h3>

              <p>
                Add expenses to see your
                spending trend here.
              </p>
            </div>
          )}

        </section>

        {/* BUDGET */}

        <section className="budget-section">

          <div className="budget-heading">

            <div>
              <span>
                MONTHLY BUDGET
              </span>

              <h2>
                Spending Progress
              </h2>

              <p>
                Keep your spending under control.
              </p>
            </div>

            <strong>
              {spentPercentage.toFixed(0)}
              <small>%</small>
            </strong>

          </div>

          <div className="budget-track">
            <div
              style={{
                width: `${spentPercentage}%`,
              }}
            ></div>
          </div>

          <div className="budget-values">
            <span>
              Spent: {formatCurrency(totalExpenses)}
            </span>

            <span>
              Available:{" "}
              {formatCurrency(
                Math.max(remainingBalance, 0)
              )}
            </span>
          </div>

        </section>

        {/* STATUS */}

        <section className="status-section">

          <div className="status-check">
            ✓
          </div>

          <div>
            <span>
              FINANCIAL STATUS
            </span>

            <h3>
              {budgetStatus.title}
            </h3>

            <p>
              {budgetStatus.text}
            </p>
          </div>

        </section>

        {/* FORM + CATEGORIES */}

        <section className="content-grid">

          <div className="form-card">

            <div className="card-heading">

              <div>
                <span>
                  NEW TRANSACTION
                </span>

                <h2>
                  Add Expense
                </h2>

                <p>
                  Record where your money goes.
                </p>
              </div>

              <div className="plus-icon">
                +
              </div>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-group">

                <label>
                  Expense Name
                </label>

                <div className="field">

                  <span>✎</span>

                  <input
                    ref={titleInputRef}
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Grocery shopping"
                  />

                </div>

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Amount
                  </label>

                  <div className="field">

                    <span>₹</span>

                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="0"
                      min="1"
                    />

                  </div>

                </div>

                <div className="form-group">

                  <label>
                    Date
                  </label>

                  <div className="field">

                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                    />

                  </div>

                </div>

              </div>

              <div className="form-group">

                <label>
                  Category
                </label>

                <div className="field select-field">

                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option>Food</option>
                    <option>Transport</option>
                    <option>Shopping</option>
                    <option>Bills</option>
                    <option>Education</option>
                    <option>Other</option>
                  </select>

                </div>

              </div>

              {error && (
                <div className="error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="add-expense"
              >
                <span>
                  Add Expense
                </span>

                <span>→</span>
              </button>

            </form>

          </div>

          {/* CATEGORIES */}

          <div className="category-card">

            <div className="card-heading">

              <div>
                <span>
                  SPENDING BREAKDOWN
                </span>

                <h2>
                  Categories
                </h2>

                <p>
                  See where your money goes.
                </p>
              </div>

              <div className="category-title-icon">
                ◈
              </div>

            </div>

            {Object.keys(categoryTotals).length ? (
              <div className="category-list">

                {Object.entries(categoryTotals)
                  .sort(
                    ([, a], [, b]) => b - a
                  )
                  .map(
                    ([category, amount]) => {

                      const percentage =
                        totalExpenses > 0
                          ? (amount /
                              totalExpenses) *
                            100
                          : 0;

                      return (
                        <div
                          className="category-item"
                          key={category}
                        >

                          <div className="category-top">

                            <div className="category-left">

                              <div className="category-icon">
                                {getCategoryIcon(
                                  category
                                )}
                              </div>

                              <div>
                                <strong>
                                  {category}
                                </strong>

                                <span>
                                  {percentage.toFixed(
                                    0
                                  )}
                                  % of spending
                                </span>
                              </div>

                            </div>

                            <strong>
                              {formatCurrency(
                                amount
                              )}
                            </strong>

                          </div>

                          <div className="category-track">

                            <div
                              style={{
                                width: `${percentage}%`,
                              }}
                            ></div>

                          </div>

                        </div>
                      );
                    }
                  )}

              </div>
            ) : (
              <div className="category-empty">

                <div>◈</div>

                <h3>
                  No categories yet
                </h3>

                <p>
                  Add your first expense and
                  category statistics will appear here.
                </p>

              </div>
            )}

          </div>

        </section>

        {/* TRANSACTIONS */}

        <section className="transactions-card">

          <div className="transactions-heading">

            <div>
              <span>
                RECENT ACTIVITY
              </span>

              <h2>
                Transactions
              </h2>

              <p>
                Your latest recorded expenses.
              </p>
            </div>

            <div className="transaction-number">

              {expenseCount}

              <small>
                TOTAL
              </small>

            </div>

          </div>

          {expenses.length ? (
            <div className="expense-list">

              {expenses.map((expense) => (

                <div
                  className="expense"
                  key={expense.id}
                >

                  <div className="expense-left">

                    <div className="expense-category">
                      {getCategoryIcon(
                        expense.category
                      )}
                    </div>

                    <div>

                      <h3>
                        {expense.title}
                      </h3>

                      <p>
                        {expense.category} •{" "}
                        {new Date(
                          `${expense.date}T00:00:00`
                        ).toLocaleDateString(
                          "en-PK",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </p>

                    </div>

                  </div>

                  <div className="expense-right">

                    <strong>
                      -{formatCurrency(
                        expense.amount
                      )}
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(expense.id)
                      }
                      title="Delete expense"
                    >
                      ×
                    </button>

                  </div>

                </div>

              ))}

            </div>
          ) : (
            <div className="empty-transactions">

              <div>₹</div>

              <h3>
                No transactions yet
              </h3>

              <p>
                Your expenses will appear here
                after you add them.
              </p>

            </div>
          )}

        </section>

      </main>

      <footer>
        <div>
          EXPENSE TRACKER
        </div>

        <p>
          Manage your money. Build better habits.
        </p>

        <span>
          Your data stays in your browser.
        </span>
      </footer>

    </div>
  );
}

export default App;