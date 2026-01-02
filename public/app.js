// ============ STATE MANAGEMENT ============
let currentRefinedGoal = null;

// ============ DOM ELEMENTS ============
const goalInput = document.getElementById('goalInput');
const charCount = document.getElementById('charCount');
const refineBtn = document.getElementById('refineBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const refinedGoalSection = document.getElementById('refinedGoalSection');
const refinedGoal = document.getElementById('refinedGoal');
const keyResultsList = document.getElementById('keyResultsList');
const confidenceBar = document.getElementById('confidenceBar');
const confidenceText = document.getElementById('confidenceText');
const saveGoalBtn = document.getElementById('saveGoalBtn');
const refineAgainBtn = document.getElementById('refineAgainBtn');
const goalsList = document.getElementById('goalsList');
const telemetryStats = document.getElementById('telemetryStats');

// ============ EVENT LISTENERS ============
goalInput.addEventListener('input', updateCharCount);
refineBtn.addEventListener('click', handleRefineGoal);
saveGoalBtn.addEventListener('click', handleSaveGoal);
refineAgainBtn.addEventListener('click', handleRefineAgain);

// ============ FUNCTIONS ============

/**
 * Update character count display
 */
function updateCharCount() {
    const count = goalInput.value.length;
    charCount.textContent = count;
    
    if (count === 500) {
        showError('Maximum character limit reached');
    }
}

/**
 * Show/hide error message
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

/**
 * Show loading indicator
 */
function setLoading(isLoading) {
    if (isLoading) {
        loadingIndicator.classList.remove('hidden');
        refineBtn.disabled = true;
    } else {
        loadingIndicator.classList.add('hidden');
        refineBtn.disabled = false;
    }
}

/**
 * Handle refine goal button click
 */
async function handleRefineGoal() {
    const goal = goalInput.value.trim();

    if (!goal) {
        showError('Please enter a goal to refine');
        return;
    }

    setLoading(true);
    errorMessage.classList.add('hidden');

    try {
        const response = await fetch('/api/goals/refine', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ goal }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to refine goal');
        }

        if (!data.success) {
            throw new Error(data.error || 'Failed to refine goal');
        }

        // Store refined goal
        currentRefinedGoal = data.data;

        // Display refined goal
        displayRefinedGoal(currentRefinedGoal);

        // Refresh goals list and telemetry
        await Promise.all([loadSavedGoals(), loadTelemetry()]);
    } catch (error) {
        showError(error.message);
        console.error('Error refining goal:', error);
    } finally {
        setLoading(false);
    }
}

/**
 * Display refined goal in UI
 */
function displayRefinedGoal(goal) {
    // Show refined goal section
    refinedGoalSection.classList.remove('hidden');

    // Display SMART goal
    refinedGoal.textContent = goal.refined_goal;

    // Display key results
    keyResultsList.innerHTML = '';
    goal.key_results.forEach((kr) => {
        const li = document.createElement('li');
        li.textContent = kr;
        keyResultsList.appendChild(li);
    });

    // Display confidence score
    const confidenceScore = goal.confidence_score;
    const confidencePercentage = (confidenceScore / 10) * 100;
    confidenceBar.style.width = confidencePercentage + '%';

    const confidenceLabels = {
        1: 'Very Low - Input doesn\'t appear to be a goal',
        2: 'Very Low',
        3: 'Low',
        4: 'Low',
        5: 'Moderate',
        6: 'Moderate',
        7: 'High',
        8: 'High',
        9: 'Very High',
        10: 'Very High - Strong goal signal',
    };

    confidenceText.textContent = `${confidenceScore}/10 - ${confidenceLabels[confidenceScore]}`;

    // Scroll to refined goal section
    refinedGoalSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Handle save goal button click
 */
async function handleSaveGoal() {
    if (!currentRefinedGoal) {
        showError('No refined goal to save');
        return;
    }

    try {
        const response = await fetch('/api/goals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userInput: goalInput.value,
                refined_goal: currentRefinedGoal.refined_goal,
                key_results: currentRefinedGoal.key_results,
                confidence_score: currentRefinedGoal.confidence_score,
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to save goal');
        }

        showSuccess('Goal saved successfully!');
        await loadSavedGoals();
    } catch (error) {
        showError(error.message);
        console.error('Error saving goal:', error);
    }
}

/**
 * Show success message
 */
function showSuccess(message) {
    const tempDiv = document.createElement('div');
    tempDiv.textContent = message;
    tempDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(tempDiv);
    setTimeout(() => tempDiv.remove(), 3000);
}

/**
 * Handle refine again button click
 */
function handleRefineAgain() {
    goalInput.value = '';
    goalInput.focus();
    refinedGoalSection.classList.add('hidden');
    currentRefinedGoal = null;
    updateCharCount();
}

/**
 * Load saved goals from API
 */
async function loadSavedGoals() {
    try {
        const response = await fetch('/api/goals');
        const data = await response.json();

        if (!data.success) {
            console.error('Failed to load goals');
            return;
        }

        const goals = data.data || [];

        if (goals.length === 0) {
            goalsList.innerHTML = '<p class="empty-state">No goals saved yet. Refine and save your first goal!</p>';
            return;
        }

        goalsList.innerHTML = '';
        goals.forEach((goal) => {
            const goalElement = createGoalElement(goal);
            goalsList.appendChild(goalElement);
        });
    } catch (error) {
        console.error('Error loading goals:', error);
    }
}

/**
 * Create goal element for list
 */
function createGoalElement(goal) {
    const div = document.createElement('div');
    div.className = 'goal-item';
    div.innerHTML = `
        <div class="goal-item-header">
            <span class="goal-item-title">${escapeHtml(goal.userInput)}</span>
            <span class="goal-item-date">${formatDate(goal.createdAt)}</span>
        </div>
        <div class="goal-item-content">
            <strong>Goal:</strong> ${escapeHtml(goal.refined_goal.substring(0, 100))}...
        </div>
        <div class="goal-item-actions">
            <button class="goal-item-delete" onclick="handleDeleteGoal('${goal.id}')">Delete</button>
        </div>
    `;
    return div;
}

/**
 * Handle delete goal
 */
async function handleDeleteGoal(goalId) {
    if (!confirm('Are you sure you want to delete this goal?')) {
        return;
    }

    try {
        const response = await fetch(`/api/goals/${goalId}`, {
            method: 'DELETE',
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to delete goal');
        }

        showSuccess('Goal deleted successfully!');
        await loadSavedGoals();
    } catch (error) {
        showError(error.message);
        console.error('Error deleting goal:', error);
    }
}

/**
 * Load telemetry data
 */
async function loadTelemetry() {
    try {
        const response = await fetch('/api/goals');
        const data = await response.json();

        if (!data.success) {
            console.error('Failed to load telemetry');
            return;
        }

        // Try to get telemetry summary (this might not be implemented yet)
        try {
            const telemetryResponse = await fetch('/api/telemetry');
            const telemetryData = await telemetryResponse.json();

            if (telemetryData.success) {
                updateTelemetryDisplay(telemetryData.data);
            }
        } catch (error) {
            // Telemetry endpoint not available, skip
        }
    } catch (error) {
        console.error('Error loading telemetry:', error);
    }
}

/**
 * Update telemetry display
 */
function updateTelemetryDisplay(stats) {
    document.getElementById('totalCalls').textContent = stats.totalCalls || 0;

    const successRate = stats.totalCalls > 0
        ? Math.round((stats.successfulCalls / stats.totalCalls) * 100)
        : 0;
    document.getElementById('successRate').textContent = successRate + '%';

    document.getElementById('avgLatency').textContent = (stats.averageLatencyMs || 0) + 'ms';
    document.getElementById('totalCost').textContent = '$' + (stats.totalCost || '0.00');
}

/**
 * Format date to readable string
 */
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    loadSavedGoals();
    loadTelemetry();
});
