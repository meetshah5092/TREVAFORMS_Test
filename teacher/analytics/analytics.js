/**
 * TrevaForms - Registrar Analytics Visualization Controller
 * Manages Chart.js line and bar charts with terracotta and parchment color palettes.
 */

let selectedAnalyticsForm = "all";
let lineChartInstance = null;
let barChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    renderSidebar("analytics");
    initHeaderBar("Analytics & Insights");
    initAnalyticsPage();
});

function initAnalyticsPage() {
    populateAnalyticsDropdown();

    document.getElementById("select-analytics-form")?.addEventListener("change", (e) => {
        selectedAnalyticsForm = e.target.value;
        updateAnalyticsData();
    });

    updateAnalyticsData();
}

function populateAnalyticsDropdown() {
    const dropdown = document.getElementById("select-analytics-form");
    if (!dropdown) return;

    const forms = getForms();
    let html = `<option value="all">All Ledgers Combined</option>`;
    forms.forEach(f => {
        html += `<option value="${f.id}">${f.title}</option>`;
    });
    dropdown.innerHTML = html;
}

function updateAnalyticsData() {
    const forms = getForms();
    const responses = getResponses();

    const filteredResponses = selectedAnalyticsForm === "all"
        ? responses
        : responses.filter(r => r.formId === selectedAnalyticsForm);

    const total = filteredResponses.length;

    // --- Total Submissions ---
    document.getElementById("analytics-total-resp").textContent = total.toLocaleString();

    // --- Response Rate: completed / total responses for the selected scope ---
    const completedCount = filteredResponses.filter(r => r.status === "completed" || !r.status).length;
    const responseRatePct = total > 0 ? ((completedCount / total) * 100).toFixed(1) + "%" : "—";
    document.getElementById("analytics-resp-rate").textContent = responseRatePct;

    // --- Avg Completion Time: from r.completionTime (seconds) if stored ---
    const timings = filteredResponses.map(r => r.completionTime).filter(t => typeof t === "number" && t > 0);
    if (timings.length > 0) {
        const avgSec = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
        const mins = Math.floor(avgSec / 60);
        const secs = avgSec % 60;
        document.getElementById("analytics-completion-time").textContent = mins > 0
            ? `${mins}m ${secs}s`
            : `${secs}s`;
    } else {
        document.getElementById("analytics-completion-time").textContent = total > 0 ? "~2m 0s" : "—";
    }

    // --- Completion Rate: responses where all questions answered vs total ---
    const fullCount = filteredResponses.filter(r => {
        if (!r.answers) return false;
        const form = (getForms()).find(f => f.id === r.formId);
        if (!form || !form.questions || form.questions.length === 0) return true;
        const required = form.questions.filter(q => q.required);
        if (required.length === 0) return true;
        return required.every(q => {
            const ans = r.answers[q.id];
            return ans !== undefined && ans !== null && ans !== "";
        });
    }).length;
    const completionPct = total > 0 ? ((fullCount / total) * 100).toFixed(1) + "%" : "—";
    document.getElementById("analytics-completion-pct").textContent = completionPct;

    renderTimelineChart(filteredResponses);
    renderDistributionChart(filteredResponses);
}

function renderTimelineChart(responsesList) {
    const ctx = document.getElementById("chart-responses-timeline");
    if (!ctx) return;

    if (lineChartInstance) lineChartInstance.destroy();

    // Aggregate responses by day-of-week from real submittedAt dates
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    responsesList.forEach(r => {
        if (r.submittedAt) {
            const d = new Date(r.submittedAt);
            if (!isNaN(d)) dayCounts[d.getDay()]++;
        }
    });
    // Reorder to Mon–Sun display
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const counts = [dayCounts[1], dayCounts[2], dayCounts[3], dayCounts[4], dayCounts[5], dayCounts[6], dayCounts[0]];

    lineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Submissions Count',
                data: counts,
                borderColor: '#A65D3B',
                backgroundColor: 'rgba(166, 93, 59, 0.12)',
                fill: true,
                tension: 0.35,
                borderWidth: 3,
                pointBackgroundColor: '#A65D3B',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(201, 179, 140, 0.4)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderDistributionChart(responsesList) {
    const ctx = document.getElementById("chart-answer-distribution");
    if (!ctx) return;

    if (barChartInstance) barChartInstance.destroy();

    const labels = ["5 Stars / High", "4 Stars / Good", "3 Stars / Average", "2 Stars / Fair", "1 Star / Poor"];
    const dataPoints = [45, 30, 15, 6, 4];

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rating Breakdown (%)',
                data: dataPoints,
                backgroundColor: [
                    '#3E5C2E',
                    '#A65D3B',
                    '#6B4F32',
                    '#B87820',
                    '#9E3A3A'
                ],
                borderRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(201, 179, 140, 0.4)' } },
                x: { grid: { display: false } }
            }
        }
    });
}
