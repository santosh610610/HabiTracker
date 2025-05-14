// DOM Elements
const habitForm = document.getElementById('habit-form');
const habitNameInput = document.getElementById('habit-name');
const repeatIntervalSelect = document.getElementById('repeat-interval');
const customDaysContainer = document.getElementById('custom-days-container');
const customDaysInput = document.getElementById('custom-days');
const habitNotesInput = document.getElementById('habit-notes');
const habitsList = document.getElementById('habits-list');
const filterButtons = document.querySelectorAll('.filter-btn');
const themeButtons = document.querySelectorAll('.theme-btn');
const modal = document.getElementById('habit-modal');
const closeModal = document.querySelector('.close-modal');
const modalHabitName = document.getElementById('modal-habit-name');
const modalRepeat = document.getElementById('modal-repeat');
const modalNotes = document.getElementById('modal-notes');
const modalNotesContainer = document.getElementById('modal-notes-container');
const historyList = document.getElementById('history-list');

// State
let habits = JSON.parse(localStorage.getItem('habits')) || [];
let currentFilter = 'all';
let currentTheme = localStorage.getItem('theme') || 'theme-default';

// Initialize the app
function init() {
    // Set the saved theme
    document.body.className = currentTheme;
    document.querySelector(`#${currentTheme}`).classList.add('active');
    
    // Render habits
    renderHabits();
    
    // Event listeners
    habitForm.addEventListener('submit', addHabit);
    repeatIntervalSelect.addEventListener('change', toggleCustomDays);
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setFilter(btn.dataset.filter);
        });
    });
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setTheme(btn.id);
        });
    });
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Toggle custom days input based on repeat interval selection
function toggleCustomDays() {
    if (repeatIntervalSelect.value === 'custom') {
        customDaysContainer.classList.remove('hidden');
    } else {
        customDaysContainer.classList.add('hidden');
    }
}

// Add a new habit
function addHabit(e) {
    e.preventDefault();
    
    const name = habitNameInput.value.trim();
    const repeatType = repeatIntervalSelect.value;
    let repeatValue = repeatType;
    
    if (repeatType === 'custom') {
        repeatValue = `${customDaysInput.value} days`;
    }
    
    const notes = habitNotesInput.value.trim();
    const today = new Date();
    
    // Calculate next due date
    let nextDueDate = new Date();
    switch (repeatType) {
        case 'daily':
            nextDueDate.setDate(today.getDate());
            break;
        case 'weekly':
            nextDueDate.setDate(today.getDate());
            break;
        case 'monthly':
            nextDueDate.setMonth(today.getMonth());
            break;
        case 'custom':
            nextDueDate.setDate(today.getDate().parseInt(customDaysInput.value));
            break;
    }
    
    const habit = {
        id: Date.now().toString(),
        name,
        repeatType,
        repeatValue,
        notes,
        createdAt: today.toISOString(),
        nextDueDate: nextDueDate.toISOString(),
        history: [],
        isCompleted: false,
        lastCompletedDate: null
    };
    
    habits.push(habit);
    saveHabits();
    renderHabits();
    
    // Reset form
    habitForm.reset();
    customDaysContainer.classList.add('hidden');
    
    // Show success message
    showNotification(`Habit "${name}" added successfully!`);
}

// Save habits to localStorage
function saveHabits() {
    localStorage.setItem('habits', JSON.stringify(habits));
}

// Render habits based on current filter
function renderHabits() {
    if (habits.length === 0) {
        habitsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-seedling empty-icon"></i>
                <p>No habits added yet. Start by adding a new habit above!</p>
            </div>
        `;
        return;
    }
    
    // Filter habits
    let filteredHabits = [...habits];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (currentFilter === 'due') {
        filteredHabits = habits.filter(habit => {
            const dueDate = new Date(habit.nextDueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate <= today && !habit.isCompleted;
        });
    } else if (currentFilter === 'completed') {
        filteredHabits = habits.filter(habit => habit.isCompleted);
    }
    
    if (filteredHabits.length === 0) {
        habitsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle empty-icon"></i>
                <p>No habits found for this filter.</p>
            </div>
        `;
        return;
    }
    
    // Sort habits: due first, then upcoming
    filteredHabits.sort((a, b) => {
        if (a.isCompleted && !b.isCompleted) return 1;
        if (!a.isCompleted && b.isCompleted) return -1;
        
        return new Date(a.nextDueDate) - new Date(b.nextDueDate);
    });
    
    // Render habits
    habitsList.innerHTML = filteredHabits.map(habit => {
        const dueDate = new Date(habit.nextDueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        let statusClass = 'status-upcoming';
        let statusText = `Next: ${formatDate(dueDate)}`;
        
        if (habit.isCompleted) {
            statusClass = 'status-completed';
            statusText = `Completed: ${formatDate(new Date(habit.lastCompletedDate))}`;
        } else if (dueDate <= today) {
            statusClass = 'status-due';
            statusText = 'Due today!';
        }
        
        return `
            <div class="habit-item" data-id="${habit.id}">
                <div class="habit-info">
                    <div class="habit-name">${habit.name}</div>
                    <div class="habit-repeat">Repeat: ${habit.repeatValue}</div>
                    <div class="habit-status ${statusClass}">${statusText}</div>
                </div>
                <div class="habit-actions">
                    ${!habit.isCompleted ? `<button class="action-btn complete-btn" onclick="completeHabit('${habit.id}')">
                        <i class="fas fa-check-circle"></i>
                    </button>` : ''}
                    <button class="action-btn info-btn" onclick="showHabitDetails('${habit.id}')">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteHabit('${habit.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Mark a habit as completed
function completeHabit(id) {
    const habitIndex = habits.findIndex(h => h.id === id);
    if (habitIndex === -1) return;
    
    const habit = habits[habitIndex];
    const today = new Date();
    
    // Add to history
    habit.history.push({
        date: today.toISOString(),
        status: 'completed'
    });
    
    // Update habit
    habit.isCompleted = true;
    habit.lastCompletedDate = today.toISOString();
    
    // Calculate next due date
    let nextDueDate = new Date();
    switch (habit.repeatType) {
        case 'daily':
            nextDueDate.setDate(today.getDate());
            break;
        case 'weekly':
            nextDueDate.setDate(today.getDate());
            break;
        case 'monthly':
            nextDueDate.setMonth(today.getMonth());
            break;
        case 'custom':
            const days = parseInt(habit.repeatValue);
            nextDueDate.setDate(today.getDate().days);
            break;
    }
    
    habit.nextDueDate = nextDueDate.toISOString();
    habit.isCompleted = false; // Reset for next interval
    
    saveHabits();
    renderHabits();
    showNotification(`Great job! "${habit.name}" marked as completed.`);
}

// Delete a habit
function deleteHabit(id) {
    if (!confirm('Are you sure you want to delete this habit?')) return;
    
    const habitIndex = habits.findIndex(h => h.id === id);
    if (habitIndex === -1) return;
    
    const habitName = habits[habitIndex].name;
    habits.splice(habitIndex, 1);
    
    saveHabits();
    renderHabits();
    showNotification(`Habit "${habitName}" deleted.`);
}

// Show habit details in modal
function showHabitDetails(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    
    modalHabitName.textContent = habit.name;
    modalRepeat.textContent = habit.repeatValue;
    
    if (habit.notes && habit.notes.trim() !== '') {
        modalNotes.textContent = habit.notes;
        modalNotesContainer.classList.remove('hidden');
    } else {
        modalNotesContainer.classList.add('hidden');
    }
    
    // Render history
    if (habit.history.length === 0) {
        historyList.innerHTML = '<p>No history yet.</p>';
    } else {
        // Sort history by date (newest first)
        const sortedHistory = [...habit.history].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
        
        historyList.innerHTML = sortedHistory.map(item => {
            return `
                <div class="history-item">
                    <span class="history-date">${formatDate(new Date(item.date))}</span>
                    <span class="history-status history-${item.status}">${item.status}</span>
                </div>
            `;
        }).join('');
    }
    
    modal.style.display = 'flex';
}

// Set current filter
function setFilter(filter) {
    currentFilter = filter;
    
    // Update active filter button
    filterButtons.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    renderHabits();
}

// Set theme
function setTheme(themeId) {
    currentTheme = themeId;
    document.body.className = themeId;
    localStorage.setItem('theme', themeId);
    
    // Update active theme button
    themeButtons.forEach(btn => {
        if (btn.id === themeId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Format date to readable string
function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Add styles
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = 'var(--primary-color)';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 4px 8px var(--shadow-color)';
    notification.style.zIndex = '1000';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Check for missed habits
function checkMissedHabits() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    habits.forEach(habit => {
        if (habit.isCompleted) return;
        
        const dueDate = new Date(habit.nextDueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        // If due date has passed and not completed
        if (dueDate < today) {
            // Add to history as missed
            habit.history.push({
                date: dueDate.toISOString(),
                status: 'missed'
            });
            
            // Calculate new due date
            let nextDueDate = new Date();
            switch (habit.repeatType) {
                case 'daily':
                    nextDueDate.setDate(today.getDate());
                    break;
                case 'weekly':
                    nextDueDate.setDate(today.getDate());
                    break;
                case 'monthly':
                    nextDueDate.setMonth(today.getMonth());
                    break;
                case 'custom':
                    const days = parseInt(habit.repeatValue);
                    nextDueDate.setDate(today.getDate().days);
                    break;
            }
            
            habit.nextDueDate = nextDueDate.toISOString();
        }
    });
    
    saveHabits();
    renderHabits();
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    init();
    checkMissedHabits();
    
    // Check for missed habits daily
    setInterval(checkMissedHabits, 86400000); // 24 hours
});