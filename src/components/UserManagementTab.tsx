import * as React from "react";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useManagementApi, type UserPayload } from "@/lib/management-api";
import type {
  Department,
  InventoryUser,
  InventoryUserRole,
  Location,
} from "@/types";

type Props = {
  users: InventoryUser[];
  setUsers: React.Dispatch<React.SetStateAction<InventoryUser[]>>;
  departments: Department[];
  locations: Location[];
  loading: boolean;
  onDelete: (id: number, label: string) => void;
};

type FormState = UserPayload;

const ROLE_OPTIONS: InventoryUserRole[] = ["admin", "admin_user", "user"];

const blankForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  location: "",
  department: "",
  role: "user",
  isActive: true,
};

export default function UserManagementTab({
  users,
  setUsers,
  departments,
  locations,
  loading,
  onDelete,
}: Props) {
  const { createUser, updateUser } = useManagementApi();
  const [query, setQuery] = React.useState("");
  const [openForm, setOpenForm] = React.useState(false);
  const [editing, setEditing] = React.useState<InventoryUser | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(blankForm);
  const selectedRole = form.role;
  const requiresScope = selectedRole !== "admin";
  const selectedLocation = form.location.trim().toLowerCase();

  const filteredDepartments = React.useMemo(() => {
    if (!selectedLocation) {
      return departments;
    }

    return departments.filter((department) => {
      const departmentLocation = department.location?.name?.trim().toLowerCase() ?? "";
      return departmentLocation === selectedLocation;
    });
  }, [departments, selectedLocation]);

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      if (!term) return true;
      return [
        user.firstName,
        user.lastName,
        user.email,
        user.location,
        user.department,
        user.role,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [query, users]);

  const setField = (key: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  React.useEffect(() => {
    if (!form.department) {
      return;
    }

    const isDepartmentAvailable = filteredDepartments.some(
      (department) => department.name === form.department,
    );

    if (!isDepartmentAvailable) {
      setForm((prev) => ({ ...prev, department: "" }));
    }
  }, [filteredDepartments, form.department]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setOpenForm(true);
  };

  const openEdit = (user: InventoryUser) => {
    setEditing(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "",
      location: user.location,
      department: user.department,
      role: user.role,
      isActive: user.isActive,
    });
    setOpenForm(true);
  };

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      alert("First name and last name are required.");
      return;
    }
    if (!form.email.trim()) {
      alert("Email is required.");
      return;
    }
    if (!editing && !form.password?.trim()) {
      alert("Password is required when creating a user.");
      return;
    }
    if (requiresScope && !form.location.trim() && !form.department.trim()) {
      alert("Location or department is required for non-admin users.");
      return;
    }

    setSaving(true);
    try {
      const payload: UserPayload = {
        ...form,
        location: requiresScope ? form.location : "",
        department: requiresScope ? form.department : "",
      };

      if (editing) {
        const updated = await updateUser(editing.id, payload);
        setUsers((current) =>
          current.map((item) => (item.id === editing.id ? updated : item)),
        );
      } else {
        const created = await createUser(payload);
        setUsers((current) => [created, ...current]);
      }

      setOpenForm(false);
      setEditing(null);
      setForm(blankForm);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">User Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Create, edit, deactivate, and manage system access.
              </p>
            </div>
            <Button onClick={openCreate} type="button" className="gap-2">
              <Plus className="h-4 w-4" /> Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="user-search">Search</Label>
            <Input
              id="user-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="name, email, location, department..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Users{" "}
            <span className="text-muted-foreground">
              {loading ? "" : `(${filtered.length})`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="mx-6 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading users...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                        <div className="text-xs text-muted-foreground">
                          {user.department}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell className="uppercase text-muted-foreground">
                        {user.role}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.location}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.isActive ? "Active" : "Inactive"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              aria-label="Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(user)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onDelete(
                                  user.id,
                                  `${user.firstName} ${user.lastName}`,
                                )
                              }
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={openForm}
        onOpenChange={(open) => !saving && setOpenForm(open)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                value={form.firstName}
                onChange={(event) => setField("firstName", event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                value={form.lastName}
                onChange={(event) => setField("lastName", event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(event) => setField("email", event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="user-password">
                {editing ? "Reset password" : "Password"}
              </Label>
              <Input
                id="user-password"
                type="password"
                value={form.password ?? ""}
                onChange={(event) => setField("password", event.target.value)}
                placeholder={
                  editing ? "Leave blank to keep current password" : ""
                }
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={form.location || "__none__"}
                onValueChange={(value) =>
                  setField("location", value === "__none__" ? "" : value)
                }
                disabled={saving || !requiresScope}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No location</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={form.department || "__none__"}
                onValueChange={(value) =>
                  setField("department", value === "__none__" ? "" : value)
                }
                disabled={saving || !requiresScope || (!!form.location && filteredDepartments.length === 0)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      form.location
                        ? "Select a department"
                        : "Select location first or choose any department"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No department</SelectItem>
                  {filteredDepartments.map((department) => (
                    <SelectItem key={department.id} value={department.name}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.location && filteredDepartments.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No departments are mapped to this location yet.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) =>
                  setField("role", value as InventoryUserRole)
                }
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <p className="text-xs text-muted-foreground">
                Admin users do not require a location or department. Non-admin
                users must have at least one access scope.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.isActive ? "active" : "inactive"}
                onValueChange={(value) => setField("isActive", value === "active")}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={saving}
              onClick={() => {
                setOpenForm(false);
                setEditing(null);
                setForm(blankForm);
              }}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={save}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editing ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
