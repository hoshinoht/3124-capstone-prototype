import { useState, useEffect } from "react";
import {
  Plus,
  Users,
  ClipboardList,
  MoreVertical,
  Trash2,
  Edit,
  UserPlus,
  Loader2,
  FolderKanban,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import {
  projectsApi,
  usersApi,
  Project,
  ProjectMember,
  Task,
  User,
} from "../services/api";

type TabType = "projects" | "create" | "details";

export function Projects() {
  const [activeTab, setActiveTab] = useState<TabType>("projects");
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [taskPage, setTaskPage] = useState(1);
  const tasksPerPage = 5;

  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    status: "active",
    memberIds: [] as string[],
  });

  const [editProject, setEditProject] = useState({
    name: "",
    description: "",
    status: "",
  });

  // Fetch projects
  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsApi.getAll();
      if (response.data?.projects) {
        setProjects(response.data.projects);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersApi.getAll();
      if (response.data?.users) {
        setAllUsers(response.data.users);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const fetchProjectDetails = async (projectId: string) => {
    try {
      const [projectRes, membersRes, tasksRes] = await Promise.all([
        projectsApi.getById(projectId),
        projectsApi.getMembers(projectId),
        projectsApi.getTasks(projectId),
      ]);

      if (projectRes.data?.project) {
        setSelectedProject(projectRes.data.project);
      }
      if (membersRes.data?.members) {
        setProjectMembers(membersRes.data.members);
      }
      if (tasksRes.data?.tasks) {
        setProjectTasks(tasksRes.data.tasks);
      }
    } catch (err) {
      console.error("Failed to fetch project details:", err);
    }
  };

  const handleSelectProject = async (project: Project) => {
    setTaskPage(1); // Reset to first page when selecting a new project
    await fetchProjectDetails(project.id);
    setActiveTab("details");
  };

  const handleCreateProject = async () => {
    if (!newProject.name) return;

    try {
      const response = await projectsApi.create({
        name: newProject.name,
        description: newProject.description,
        status: newProject.status,
        memberIds: newProject.memberIds,
      });

      if (response.success) {
        await fetchProjects();
        setNewProject({ name: "", description: "", status: "active", memberIds: [] });
        setActiveTab("projects");
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    try {
      const response = await projectsApi.update(selectedProject.id, {
        name: editProject.name,
        description: editProject.description,
        status: editProject.status,
      });

      if (response.success) {
        await fetchProjectDetails(selectedProject.id);
        await fetchProjects();
        setShowEditModal(false);
      }
    } catch (err) {
      console.error("Failed to update project:", err);
    }
  };

  const openDeleteModal = (project: Project) => {
    setProjectToDelete(project);
    setDeleteConfirmName("");
    setShowDeleteModal(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    if (deleteConfirmName !== projectToDelete.name) return;

    try {
      await projectsApi.delete(projectToDelete.id);
      await fetchProjects();
      setSelectedProject(null);
      setActiveTab("projects");
      setShowDeleteModal(false);
      setProjectToDelete(null);
      setDeleteConfirmName("");
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  const handleAddMember = async () => {
    if (!selectedProject || !selectedUserToAdd) return;

    try {
      await projectsApi.addMember(selectedProject.id, {
        userId: selectedUserToAdd,
        role: selectedRole,
      });
      await fetchProjectDetails(selectedProject.id);
      setShowAddMemberModal(false);
      setSelectedUserToAdd("");
      setSelectedRole("member");
    } catch (err) {
      console.error("Failed to add member:", err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedProject) return;
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      await projectsApi.removeMember(selectedProject.id, userId);
      await fetchProjectDetails(selectedProject.id);
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  const openEditModal = () => {
    if (selectedProject) {
      setEditProject({
        name: selectedProject.name,
        description: selectedProject.description || "",
        status: selectedProject.status,
      });
      setShowEditModal(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 border-green-300";
      case "completed":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "archived":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-700";
      case "admin":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Get users not already in the project
  const availableUsers = allUsers.filter(
    (user) => !projectMembers.some((member) => member.userId === user.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl text-gray-900 mb-1">Projects</h1>
          <p className="text-sm text-gray-600">
            Manage projects, team members, and track tasks
          </p>
        </div>
        <Button
          onClick={() => setActiveTab("create")}
          className="bg-black hover:bg-gray-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm mb-6">
        <button
          onClick={() => setActiveTab("projects")}
          className={`flex-1 py-2.5 px-4 rounded-md text-sm transition-colors ${activeTab === "projects"
            ? "bg-gray-100 text-gray-900"
            : "text-gray-600 hover:text-gray-900"
            }`}
        >
          All Projects
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`flex-1 py-2.5 px-4 rounded-md text-sm transition-colors ${activeTab === "create"
            ? "bg-gray-100 text-gray-900"
            : "text-gray-600 hover:text-gray-900"
            }`}
        >
          Create Project
        </button>
        {selectedProject && (
          <button
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm transition-colors ${activeTab === "details"
              ? "bg-gray-100 text-gray-900"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Project Details
          </button>
        )}
      </div>

      {/* Content */}
      <Card className="p-6">
        {/* Projects List Tab */}
        {activeTab === "projects" && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg mb-1">Your Projects</h2>
              <p className="text-sm text-gray-600">
                {projects.length} project{projects.length !== 1 ? "s" : ""} currently available
              </p>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No projects yet</p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  + Create your first project
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900">
                        {project.name}
                      </h3>
                      <Badge className={`${getStatusColor(project.status)} text-xs`}>
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {project.description || "No description"}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{project.memberCount || 0} members</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>{project.taskCount || 0} tasks</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Project Tab */}
        {activeTab === "create" && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg mb-1">Create New Project</h2>
              <p className="text-sm text-gray-600">
                Set up a new project and invite team members
              </p>
            </div>

            <div className="space-y-4 max-w-lg">
              <div>
                <Label htmlFor="project-name">Project Name *</Label>
                <Input
                  id="project-name"
                  placeholder="Enter project name"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  placeholder="Describe the project objectives and scope"
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({ ...newProject, description: e.target.value })
                  }
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="project-status">Status</Label>
                <Select
                  value={newProject.status}
                  onValueChange={(value) =>
                    setNewProject({ ...newProject, status: value })
                  }
                >
                  <SelectTrigger id="project-status" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreateProject}
                disabled={!newProject.name}
                className="w-full bg-black hover:bg-gray-800"
              >
                Create Project
              </Button>
            </div>
          </div>
        )}

        {/* Project Details Tab */}
        {activeTab === "details" && selectedProject && (
          <div>
            {/* Project Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg">{selectedProject.name}</h2>
                  <Badge className={getStatusColor(selectedProject.status)}>
                    {selectedProject.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {selectedProject.description || "No description"}
                </p>
              </div>
              {/* Only show edit/delete buttons for owners and admins */}
              {(selectedProject.currentUserRole === "owner" || selectedProject.currentUserRole === "admin") && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={openEditModal}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  {selectedProject.currentUserRole === "owner" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteModal(selectedProject)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Members Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Team Members</h3>
                  {/* Only show Add Member button for owners and admins */}
                  {(selectedProject.currentUserRole === "owner" || selectedProject.currentUserRole === "admin") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddMemberModal(true)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add Member
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {projectMembers.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">
                      No members yet
                    </p>
                  ) : (
                    projectMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <Badge
                              className={`${getRoleColor(member.role)} text-xs`}
                            >
                              {member.role}
                            </Badge>
                          </div>
                        </div>
                        {/* Only show remove button for owners/admins and not for the owner role */}
                        {member.role !== "owner" &&
                          (selectedProject.currentUserRole === "owner" || selectedProject.currentUserRole === "admin") && (
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tasks Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Project Tasks</h3>
                  <span className="text-sm text-gray-500">
                    {projectTasks.length} task{projectTasks.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-2">
                  {projectTasks.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">
                      No tasks assigned to this project yet
                    </p>
                  ) : (
                    <>
                      {projectTasks
                        .slice((taskPage - 1) * tasksPerPage, taskPage * tasksPerPage)
                        .map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                          >
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm ${task.isCompleted
                                  ? "line-through text-gray-500"
                                  : "text-gray-900"
                                  }`}
                              >
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  className={`text-xs ${task.urgency === "urgent"
                                    ? "bg-red-100 text-red-700"
                                    : task.urgency === "high"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-gray-100 text-gray-700"
                                    }`}
                                >
                                  {task.urgency}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  Due: {task.deadline}
                                </span>
                              </div>
                            </div>
                            {task.isCompleted && (
                              <Badge className="bg-green-100 text-green-700 text-xs ml-2">
                                Done
                              </Badge>
                            )}
                          </div>
                        ))}

                      {/* Pagination Controls */}
                      {projectTasks.length > tasksPerPage && (
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200 mt-3">
                          <span className="text-xs text-gray-500">
                            Showing {(taskPage - 1) * tasksPerPage + 1}-{Math.min(taskPage * tasksPerPage, projectTasks.length)} of {projectTasks.length}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setTaskPage((p) => Math.max(1, p - 1))}
                              disabled={taskPage === 1}
                              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-gray-600 px-2">
                              {taskPage} / {Math.ceil(projectTasks.length / tasksPerPage)}
                            </span>
                            <button
                              onClick={() => setTaskPage((p) => Math.min(Math.ceil(projectTasks.length / tasksPerPage), p + 1))}
                              disabled={taskPage >= Math.ceil(projectTasks.length / tasksPerPage)}
                              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Add Team Member</h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="member-select">Select User</Label>
                <Select value={selectedUserToAdd} onValueChange={setSelectedUserToAdd}>
                  <SelectTrigger id="member-select" className="mt-1">
                    <SelectValue placeholder="Choose a user to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.length === 0 ? (
                      <SelectItem value="" disabled>
                        No users available
                      </SelectItem>
                    ) : (
                      availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="role-select">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="role-select" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddMemberModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-black hover:bg-gray-800"
                  onClick={handleAddMember}
                  disabled={!selectedUserToAdd}
                >
                  Add Member
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Edit Project</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Project Name</Label>
                <Input
                  id="edit-name"
                  value={editProject.name}
                  onChange={(e) =>
                    setEditProject({ ...editProject, name: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editProject.description}
                  onChange={(e) =>
                    setEditProject({ ...editProject, description: e.target.value })
                  }
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editProject.status}
                  onValueChange={(value) =>
                    setEditProject({ ...editProject, status: value })
                  }
                >
                  <SelectTrigger id="edit-status" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-black hover:bg-gray-800"
                  onClick={handleUpdateProject}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {showDeleteModal && projectToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete Project</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                ⚠️ Warning: Deleting this project will permanently remove:
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                <li>All team members from this project</li>
                <li>All tasks assigned to this project</li>
                <li>All meetings scheduled under this project</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="delete-confirm" className="text-sm text-gray-700">
                  To confirm deletion, type the project name exactly:
                </Label>
                <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded mt-1 mb-2">
                  {projectToDelete.name}
                </p>
                <Input
                  id="delete-confirm"
                  placeholder="Type project name to confirm"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProjectToDelete(null);
                    setDeleteConfirmName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteProject}
                  disabled={deleteConfirmName !== projectToDelete.name}
                >
                  Delete Project
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
