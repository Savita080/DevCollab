import { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import { PriorityChip } from '../ui/Badge';
import { TASK_STATUS_COLORS } from '../../store/tasks';
import { taskAssignees } from '../../lib/utils';
import s from '../../styles/modules/KanbanCalendar.module.css';

// Helper to get days in a month grid
function getCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start on Sunday
  
  const endDate = new Date(lastDay);
  if (endDate.getDay() !== 6) {
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday
  }
  
  const grid = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    grid.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return grid;
}

function DayTasksModal({ date, tasks, onClose, onTaskClick }) {
  if (!date) return null;
  
  const dateStr = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  return (
    <Modal open={true} onClose={onClose} title={`Tasks for ${dateStr}`}>
      <div className={s.modalDayTasks}>
        {tasks.length === 0 ? (
          <p style={{ color: 'var(--text-2)', textAlign: 'center', padding: '20px' }}>No tasks due on this date.</p>
        ) : (
          tasks.map(t => (
            <div 
              key={t._id} 
              className={s.modalTaskItem} 
              onClick={() => { onClose(); onTaskClick(t); }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', t._id);
                // Close modal immediately so the user can see the calendar to drop it
                setTimeout(onClose, 0); 
              }}
            >
              <div className={s.modalTaskTitle}>{t.title}</div>
              <div className={s.modalTaskMeta}>
                <PriorityChip priority={t.priority} />
                <span 
                  className={s.statusChip}
                  style={{ color: TASK_STATUS_COLORS[t.status], border: `1px solid ${TASK_STATUS_COLORS[t.status]}` }}
                >
                  {t.status}
                </span>
                {(() => {
                  const names = taskAssignees(t).map(a => a.name).filter(Boolean);
                  if (!names.length) return null;
                  const label = names.length === 1 ? names[0] : `${names.length} assignees`;
                  return <span style={{ color: 'var(--text-2)' }}>• {label}</span>;
                })()}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

export default function KanbanCalendar({ tasks, onTaskClick, onTaskDrop }) {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const gridDays = useMemo(() => getCalendarGrid(year, month), [year, month]);

  // Group tasks by local date string (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (t.dueDate) {
        // Use substring to avoid timezone shift on YYYY-MM-DD parsing
        const key = typeof t.dueDate === 'string' ? t.dueDate.substring(0, 10) : new Date(t.dueDate).toISOString().substring(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [tasks]);

  const monthName = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const unscheduledTasks = useMemo(() => tasks.filter(t => !t.dueDate), [tasks]);

  return (
    <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0, margin: '0 16px 16px 16px' }}>
      <div className={s.calendarContainer} style={{ margin: 0, flex: 1, minHeight: 0 }}>
      <div className={s.header}>
        <div className={s.monthNav}>
          <button onClick={handlePrevMonth}>◀</button>
          <button onClick={handleToday}>Today</button>
          <button onClick={handleNextMonth}>▶</button>
        </div>
        <div className={s.monthTitle}>{monthName}</div>
        <div style={{ width: 120 }}></div> {/* Spacer for centering */}
      </div>

      <div className={s.grid} style={{ gridTemplateRows: `auto repeat(${gridDays.length / 7}, 1fr)` }}>
        {/* Day Headers */}
        {dayNames.map(name => (
          <div key={name} className={s.dayHeader}>{name}</div>
        ))}

        {/* Days */}
        {gridDays.map((date, i) => {
          const isOtherMonth = date.getMonth() !== month;
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          const dateKey = `${yyyy}-${mm}-${dd}`;
          const isToday = dateKey === todayStr;
          const dayTasks = tasksByDate[dateKey] || [];
          
          return (
            <div 
              key={i} 
              className={`${s.cell} ${isOtherMonth ? s.otherMonth : ''} ${isToday ? s.today : ''}`}
              onClick={() => setSelectedDate(date)}
              onDragOver={(e) => {
                e.preventDefault(); // allow drop
                e.currentTarget.style.backgroundColor = 'var(--bg-card-premium)';
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.backgroundColor = '';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.backgroundColor = '';
                const taskId = e.dataTransfer.getData('text/plain');
                if (taskId && onTaskDrop) {
                  onTaskDrop(taskId, dateKey); // dateKey is "YYYY-MM-DD"
                }
              }}
            >
              <div className={s.cellHeader}>
                {dayTasks.length > 0 ? (
                  <div className={s.taskCountAlert}>{dayTasks.length}</div>
                ) : <div />}
                <div className={s.dateNum}>{date.getDate()}</div>
              </div>
              
              <div className={s.tasksWrapper}>
                {dayTasks.slice(0, 3).map(t => {
                  const baseColor = TASK_STATUS_COLORS[t.status];
                  
                  return (
                    <div 
                      key={t._id} 
                      className={s.taskIndicator}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', t._id);
                      }}
                    >
                      <span 
                        style={{ 
                          display: 'inline-block', 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          backgroundColor: baseColor || 'var(--primary)',
                          flexShrink: 0
                        }} 
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                    </div>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div className={s.moreTasks}>+ {dayTasks.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <DayTasksModal 
          date={selectedDate} 
          tasks={tasksByDate[`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`] || []}
          onClose={() => setSelectedDate(null)} 
          onTaskClick={onTaskClick} 
        />
      )}
      </div>

      <div className={s.unscheduledSidebar}>
        <div className={s.unscheduledHeader}>
          Unscheduled Tasks
          <span className={s.unscheduledCount}>{unscheduledTasks.length}</span>
        </div>
        <div 
          className={s.unscheduledList}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = 'var(--bg-2)';
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.backgroundColor = '';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = '';
            const taskId = e.dataTransfer.getData('text/plain');
            if (taskId && onTaskDrop) {
              onTaskDrop(taskId, null); // clear due date
            }
          }}
        >
          {unscheduledTasks.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-2)', fontSize: '0.85rem' }}>
              All tasks are scheduled!
            </div>
          ) : (
            unscheduledTasks.map(t => (
              <div 
                key={t._id} 
                className={s.unscheduledTask}
                onClick={() => onTaskClick(t)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', t._id);
                }}
              >
                <div className={s.unscheduledTitle}>{t.title}</div>
                <div className={s.modalTaskMeta}>
                  <PriorityChip priority={t.priority} />
                  <span 
                    className={s.statusChip}
                    style={{ color: TASK_STATUS_COLORS[t.status], border: `1px solid ${TASK_STATUS_COLORS[t.status]}` }}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
