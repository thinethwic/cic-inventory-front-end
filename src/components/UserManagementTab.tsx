import * as React from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Inbox,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const blankForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  locationId: null,
  departmentId: null,
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
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(25);

  const [openForm, setOpenForm] = React.useState(false);
  const [editing, setEditing] = React.useState<InventoryUser | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(blankForm);

  const selectedRole = form.role;
  const requiresScope = selectedRole !== "admin";
  const selectedLocationId = form.locationId;

  const filteredDepartments = React.useMemo(() => {
    if (!selectedLocationId) return departments;
    return departments.filter((d) => d.location?.id === selectedLocationId);
  }, [departments, selectedLocationId]);

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

  const totalElements = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const rangeStart = totalElements === 0 ? 0 : safePage * pageSize + 1;
  const rangeEnd = Math.min((safePage + 1) * pageSize, totalElements);
  const paginated = filtered.slice(
    safePage * pageSize,
    (safePage + 1) * pageSize,
  );

  // Reset to first page when query changes
  React.useEffect(() => {
    setPage(0);
  }, [query]);

  // Clamp page if filtered results shrink
  React.useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  // Clear department if it no longer belongs to the selected location
  React.useEffect(() => {
    if (!form.departmentId) return;
    const isDepartmentAvailable = filteredDepartments.some(
      (d) => d.id === form.departmentId,
    );
    if (!isDepartmentAvailable) {
      setForm((prev) => ({ ...prev, departmentId: null }));
    }
  }, [filteredDepartments, form.departmentId]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
      locationId: user.locationId ?? null,
      departmentId: user.departmentId ?? null,
      role: user.role,
      isActive: user.isActive,
    });
    setOpenForm(true);
  };

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First name and last name are required.");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (!editing && !form.password?.trim()) {
      toast.error("Password is required when creating a user.");
      return;
    }
    if (requiresScope && !form.locationId) {
      toast.error("Location is required for non-admin users.");
      return;
    }

    setSaving(true);
    try {
      const payload: UserPayload = {
        ...form,
        locationId: requiresScope ? form.locationId : null,
        departmentId: requiresScope ? form.departmentId : null,
      };

      if (editing) {
        const updated = await updateUser(editing.id, payload);
        setUsers((current) =>
          current.map((item) => (item.id === editing.id ? updated : item)),
        );
        toast.success("User updated", {
          description: `${updated.firstName} ${updated.lastName}`,
        });
      } else {
        const created = await createUser(payload);
        setUsers((current) => [created, ...current]);
        toast.success("User created", {
          description: `${created.firstName} ${created.lastName}`,
        });
      }

      setOpenForm(false);
      setEditing(null);
      setForm(blankForm);
    } catch (error) {
      toast.error("Save failed", {
        description:
          error instanceof Error ? error.message : "Unable to save user",
      });
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
              {loading ? "" : `(${totalElements})`}
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
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={6} className="py-3">
                        <Skeleton className="h-4 w-full max-w-sm" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <Inbox className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p>No users found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((user) => (
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

          {/* Pagination footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {totalElements === 0
                ? "No results"
                : `Showing ${rangeStart}–${rangeEnd} of ${totalElements}`}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Rows per page
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  type="button"
                  onClick={() => setPage(0)}
                  disabled={safePage === 0}
                  title="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[90px] text-center text-sm text-muted-foreground">
                  Page {safePage + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={safePage + 1 >= totalPages}
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  type="button"
                  onClick={() => setPage(totalPages - 1)}
                  disabled={safePage + 1 >= totalPages}
                  title="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
                value={form.locationId ? String(form.locationId) : "__none__"}
                onValueChange={(value) =>
                  setField(
                    "locationId",
                    value === "__none__" ? null : Number(value),
                  )
                }
                disabled={saving || !requiresScope}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No location</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={String(location.id)}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={
                  form.departmentId ? String(form.departmentId) : "__none__"
                }
                onValueChange={(value) =>
                  setField(
                    "departmentId",
                    value === "__none__" ? null : Number(value),
                  )
                }
                disabled={
                  saving ||
                  !requiresScope ||
                  (!!form.locationId && filteredDepartments.length === 0)
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      form.locationId
                        ? "Select a department"
                        : "Select location first or choose any department"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No department</SelectItem>
                  {filteredDepartments.map((department) => (
                    <SelectItem
                      key={department.id}
                      value={String(department.id)}
                    >
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.locationId && filteredDepartments.length === 0 ? (
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
                users must have at least one access scope assigned.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.isActive ? "active" : "inactive"}
                onValueChange={(value) =>
                  setField("isActive", value === "active")
                }
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
