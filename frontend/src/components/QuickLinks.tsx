import { useState, useEffect } from "react";
import { CheckCircle2, Clock, AlertTriangle, Loader2, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { tasksApi, Task, TaskAssignee } from "../services/api";

interface TodayTask extends Task {
  assignees?: TaskAssignee[];
}

export function QuickLinks() {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayTasks = async () => {
      try {
        setLoading(true);
        const response = await tasksApi.getMyTodayTasks();
        if (response.data?.tasks) {
          setTasks(response.data.tasks);
        }
      } catch (err) {
        console.error("Failed to fetch today's tasks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayTasks();
  }, []);

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'high':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'medium':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-400" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'border-red-500/50 hover:border-red-500';
      case 'high':
        return 'border-orange-500/50 hover:border-orange-500';
      case 'medium':
        return 'border-yellow-500/50 hover:border-yellow-500';
      default:
        return 'border-blue-500/50 hover:border-blue-500';
    }
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatAssignees = (assignees?: TaskAssignee[]) => {
    if (!assignees || assignees.length === 0) return '';
    if (assignees.length <= 2) {
      return assignees.map(a => a.firstName || a.name?.split(' ')[0]).join(', ');
    }
    return `${assignees[0].firstName || assignees[0].name?.split(' ')[0]}, +${assignees.length - 1} more`;
  };

  const handleTaskClick = (task: TodayTask) => {
    // Navigate to task management with the task selected
    // For now, we'll just log it - you can implement navigation here
    console.log('Selected task:', task);
  };

  const handleMarkComplete = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    try {
      await tasksApi.updateStatus(taskId, 'completed');
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error("Failed to mark task as complete:", err);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 text-white border-gray-800">
        <CardHeader>
          <CardTitle>Today's Tasks</CardTitle>
          <CardDescription className="text-gray-400">
            Your assigned tasks for today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 text-white border-gray-800">
      <CardHeader>
        <CardTitle>Today's Tasks</CardTitle>
        <CardDescription className="text-gray-400">
          Your assigned tasks for today
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No tasks for today</p>
            <p className="text-sm text-gray-500 mt-1">All caught up! Check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className={`text-left p-4 hover:bg-gray-800 rounded-lg transition-colors flex items-start gap-3 border ${getUrgencyColor(task.urgency)}`}
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                  {getUrgencyIcon(task.urgency)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-blue-400 mb-1 truncate">{task.title}</p>
                  <p className="text-xs text-gray-400 mb-0.5">
                    Due: {formatDeadline(task.deadline)}
                    {task.projectName && ` • ${task.projectName}`}
                  </p>
                  {task.assignees && task.assignees.length > 0 && (
                    <p className="text-xs text-gray-500">{formatAssignees(task.assignees)}</p>
                  )}
                </div>
                <button
                  onClick={(e) => handleMarkComplete(e, task.id)}
                  className="flex-shrink-0 p-1 hover:bg-gray-700 rounded transition-colors"
                  title="Mark as complete"
                >
                  <CheckCircle2 className="w-5 h-5 text-gray-500 hover:text-green-500" />
                </button>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
