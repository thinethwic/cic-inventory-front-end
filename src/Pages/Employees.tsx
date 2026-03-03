// src/Pages/Employees.tsx
import * as React from "react";
import { Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ✅ Types + seed data imported
import type {
  Department,
  Location,
  Supplier,
  SystemUser,
  Employee,
  UserRole,
  EmployeeStatus,
} from "@/types";
import { genId } from "@/types";

import {
  seedDepartments,
  seedLocations,
  seedSuppliers,
  seedUsers,
  seedEmployees,
} from "@/assets.seed";

function ActionMenu(props: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Actions" type="button">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={props.onEdit}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={props.onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SmallLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted-foreground">{children}</div>;
}

export default function EmployeesPage() {
  // Data state (replace with API later)
  const [departments, setDepartments] =
    React.useState<Department[]>(seedDepartments);
  const [locations, setLocations] = React.useState<Location[]>(seedLocations);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>(seedSuppliers);
  const [users, setUsers] = React.useState<SystemUser[]>(seedUsers);
  const [employees, setEmployees] = React.useState<Employee[]>(seedEmployees);

  const [deleteTarget, setDeleteTarget] = React.useState<{
    type: "employee" | "department" | "location" | "supplier" | "user";
    id: string;
    label: string;
  } | null>(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;

    const { type, id } = deleteTarget;

    if (type === "employee") setEmployees((p) => p.filter((x) => x.id !== id));
    if (type === "department")
      setDepartments((p) => p.filter((x) => x.id !== id));
    if (type === "location") setLocations((p) => p.filter((x) => x.id !== id));
    if (type === "supplier") setSuppliers((p) => p.filter((x) => x.id !== id));
    if (type === "user") setUsers((p) => p.filter((x) => x.id !== id));

    setDeleteTarget(null);
  };

  const deptName = React.useCallback(
    (id: string) => departments.find((d) => d.id === id)?.name ?? "-",
    [departments],
  );

  const locName = React.useCallback(
    (id: string) => locations.find((l) => l.id === id)?.name ?? "-",
    [locations],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage Employees, Users, Suppliers, Departments, and Locations.
        </p>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <EmployeesTab
          employees={employees}
          setEmployees={setEmployees}
          departments={departments}
          locations={locations}
          onDelete={(id, label) =>
            setDeleteTarget({ type: "employee", id, label })
          }
          deptName={deptName}
          locName={locName}
        />

        <UsersTab
          users={users}
          setUsers={setUsers}
          onDelete={(id, label) => setDeleteTarget({ type: "user", id, label })}
        />

        <SuppliersTab
          suppliers={suppliers}
          setSuppliers={setSuppliers}
          onDelete={(id, label) =>
            setDeleteTarget({ type: "supplier", id, label })
          }
        />

        <DepartmentsTab
          departments={departments}
          setDepartments={setDepartments}
          onDelete={(id, label) =>
            setDeleteTarget({ type: "department", id, label })
          }
        />

        <LocationsTab
          locations={locations}
          setLocations={setLocations}
          onDelete={(id, label) =>
            setDeleteTarget({ type: "location", id, label })
          }
        />
      </Tabs>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will remove "${deleteTarget.label}". This action cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} type="button">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ========================== EMPLOYEES TAB ========================== */

function EmployeesTab(props: {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  departments: Department[];
  locations: Location[];
  onDelete: (id: string, label: string) => void;
  deptName: (id: string) => string;
  locName: (id: string) => string;
}) {
  const {
    employees,
    setEmployees,
    departments,
    locations,
    onDelete,
    deptName,
    locName,
  } = props;

  const [q, setQ] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState<string | "All">("All");
  const [locFilter, setLocFilter] = React.useState<string | "All">("All");
  const [statusFilter, setStatusFilter] = React.useState<
    EmployeeStatus | "All"
  >("All");

  const [openForm, setOpenForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const emptyForm: Omit<Employee, "id" | "createdAt"> = {
    empId: "",
    name: "",
    departmentId: departments[0]?.id ?? "",
    locationId: locations[0]?.id ?? "",
    phone: "",
    email: "",
    status: "Active",
  };

  const [form, setForm] = React.useState(emptyForm);

  React.useEffect(() => {
    setForm((p) => ({
      ...p,
      departmentId: p.departmentId || (departments[0]?.id ?? ""),
      locationId: p.locationId || (locations[0]?.id ?? ""),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments.length, locations.length]);

  const filtered = React.useMemo(() => {
    const text = q.trim().toLowerCase();
    return employees.filter((e) => {
      const matchText =
        !text ||
        `${e.empId} ${e.name} ${e.email ?? ""} ${e.phone ?? ""}`
          .toLowerCase()
          .includes(text);

      const matchDept =
        deptFilter === "All" ? true : e.departmentId === deptFilter;
      const matchLoc = locFilter === "All" ? true : e.locationId === locFilter;
      const matchStatus =
        statusFilter === "All" ? true : e.status === statusFilter;

      return matchText && matchDept && matchLoc && matchStatus;
    });
  }, [employees, q, deptFilter, locFilter, statusFilter]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpenForm(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({
      empId: emp.empId,
      name: emp.name,
      departmentId: emp.departmentId,
      locationId: emp.locationId,
      phone: emp.phone ?? "",
      email: emp.email ?? "",
      status: emp.status,
    });
    setOpenForm(true);
  };

  const validate = (): string | null => {
    if (!form.empId.trim()) return "Employee ID is required.";
    if (!form.name.trim()) return "Employee name is required.";
    if (!form.departmentId) return "Department is required.";
    if (!form.locationId) return "Location is required.";
    return null;
  };

  const save = () => {
    const err = validate();
    if (err) return alert(err);

    if (editingId) {
      setEmployees((p) =>
        p.map((x) => (x.id === editingId ? { ...x, ...form } : x)),
      );
    } else {
      const newRow: Employee = {
        id: genId("emp"),
        createdAt: new Date().toISOString().slice(0, 10),
        ...form,
      };
      setEmployees((p) => [newRow, ...p]);
    }
    setOpenForm(false);
  };

  return (
    <TabsContent value="employees" className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Employees</CardTitle>
              <SmallLabel>Employees used for asset assignment</SmallLabel>
            </div>
            <Button onClick={openAdd} className="gap-2" type="button">
              <Plus className="h-4 w-4" /> Add Employee
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <SmallLabel>Search</SmallLabel>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="emp id, name, email..."
            />
          </div>

          <div className="space-y-1">
            <SmallLabel>Department</SmallLabel>
            <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <SmallLabel>Location</SmallLabel>
            <Select value={locFilter} onValueChange={(v) => setLocFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 md:col-span-1">
            <SmallLabel>Status</SmallLabel>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as EmployeeStatus | "All")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Employee List{" "}
            <span className="text-muted-foreground">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emp ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.empId}</TableCell>
                      <TableCell>{e.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {deptName(e.departmentId)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {locName(e.locationId)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="text-sm">{e.phone || "-"}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.email || ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            e.status === "Active" ? "secondary" : "outline"
                          }
                        >
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ActionMenu
                          onEdit={() => openEdit(e)}
                          onDelete={() =>
                            onDelete(e.id, `${e.empId} - ${e.name}`)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Employee Form */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <SmallLabel>Employee ID *</SmallLabel>
              <Input
                value={form.empId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, empId: e.target.value }))
                }
                placeholder="E1023"
              />
            </div>

            <div className="space-y-1">
              <SmallLabel>Name *</SmallLabel>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Full name"
              />
            </div>

            <div className="space-y-1">
              <SmallLabel>Department *</SmallLabel>
              <Select
                value={form.departmentId}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, departmentId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <SmallLabel>Location *</SmallLabel>
              <Select
                value={form.locationId}
                onValueChange={(v) => setForm((p) => ({ ...p, locationId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <SmallLabel>Phone</SmallLabel>
              <Input
                value={form.phone ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="07X-XXX-XXXX"
              />
            </div>

            <div className="space-y-1">
              <SmallLabel>Email</SmallLabel>
              <Input
                value={form.email ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="name@cic.lk"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <SmallLabel>Status</SmallLabel>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, status: v as EmployeeStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenForm(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button onClick={save} type="button">
              {editingId ? "Save Changes" : "Create Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}

/* ========================== USERS TAB ========================== */

function UsersTab(props: {
  users: SystemUser[];
  setUsers: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  onDelete: (id: string, label: string) => void;
}) {
  const { users, setUsers, onDelete } = props;

  const [q, setQ] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<UserRole | "All">("All");
  const [openForm, setOpenForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const emptyForm: Omit<SystemUser, "id" | "createdAt"> = {
    name: "",
    email: "",
    role: "Viewer",
    active: true,
  };

  const [form, setForm] = React.useState(emptyForm);

  const filtered = React.useMemo(() => {
    const text = q.trim().toLowerCase();
    return users.filter((u) => {
      const matchText =
        !text || `${u.name} ${u.email}`.toLowerCase().includes(text);
      const matchRole = roleFilter === "All" ? true : u.role === roleFilter;
      return matchText && matchRole;
    });
  }, [users, q, roleFilter]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpenForm(true);
  };

  const openEdit = (u: SystemUser) => {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, role: u.role, active: u.active });
    setOpenForm(true);
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "User name is required.";
    if (!form.email.trim()) return "Email is required.";
    return null;
  };

  const save = () => {
    const err = validate();
    if (err) return alert(err);

    if (editingId) {
      setUsers((p) =>
        p.map((x) => (x.id === editingId ? { ...x, ...form } : x)),
      );
    } else {
      setUsers((p) => [
        {
          id: genId("usr"),
          createdAt: new Date().toISOString().slice(0, 10),
          ...form,
        },
        ...p,
      ]);
    }
    setOpenForm(false);
  };

  return (
    <TabsContent value="users" className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Users</CardTitle>
              <SmallLabel>
                Internal system users (Admin/Technician/Viewer)
              </SmallLabel>
            </div>
            <Button onClick={openAdd} className="gap-2" type="button">
              <Plus className="h-4 w-4" /> Add User
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1 md:col-span-2">
            <SmallLabel>Search</SmallLabel>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="name, email..."
            />
          </div>

          <div className="space-y-1">
            <SmallLabel>Role</SmallLabel>
            <Select
              value={roleFilter}
              onValueChange={(v) => setRoleFilter(v as UserRole | "All")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Technician">Technician</SelectItem>
                <SelectItem value="Viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            User List{" "}
            <span className="text-muted-foreground">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.active ? "secondary" : "outline"}>
                          {u.active ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ActionMenu
                          onEdit={() => openEdit(u)}
                          onDelete={() => onDelete(u.id, u.email)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <SmallLabel>Name *</SmallLabel>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <SmallLabel>Email *</SmallLabel>
              <Input
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <SmallLabel>Role</SmallLabel>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, role: v as UserRole }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Technician">Technician</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <SmallLabel>Active</SmallLabel>
              <Select
                value={form.active ? "Yes" : "No"}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, active: v === "Yes" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenForm(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button onClick={save} type="button">
              {editingId ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}

/* ========================== SUPPLIERS TAB ========================== */

function SuppliersTab(props: {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  onDelete: (id: string, label: string) => void;
}) {
  const { suppliers, setSuppliers, onDelete } = props;

  const [q, setQ] = React.useState("");
  const [openForm, setOpenForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const emptyForm: Omit<Supplier, "id" | "createdAt"> = {
    name: "",
    phone: "",
    email: "",
  };
  const [form, setForm] = React.useState(emptyForm);

  const filtered = React.useMemo(() => {
    const text = q.trim().toLowerCase();
    return suppliers.filter(
      (s) =>
        !text ||
        `${s.name} ${s.phone ?? ""} ${s.email ?? ""}`
          .toLowerCase()
          .includes(text),
    );
  }, [suppliers, q]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpenForm(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({ name: s.name, phone: s.phone ?? "", email: s.email ?? "" });
    setOpenForm(true);
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "Supplier name is required.";
    return null;
  };

  const save = () => {
    const err = validate();
    if (err) return alert(err);

    if (editingId) {
      setSuppliers((p) =>
        p.map((x) => (x.id === editingId ? { ...x, ...form } : x)),
      );
    } else {
      setSuppliers((p) => [
        {
          id: genId("sup"),
          createdAt: new Date().toISOString().slice(0, 10),
          ...form,
        },
        ...p,
      ]);
    }
    setOpenForm(false);
  };

  return (
    <TabsContent value="suppliers" className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Suppliers</CardTitle>
              <SmallLabel>Vendors for purchasing and maintenance</SmallLabel>
            </div>
            <Button onClick={openAdd} className="gap-2" type="button">
              <Plus className="h-4 w-4" /> Add Supplier
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <SmallLabel>Search</SmallLabel>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="name, phone, email..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Supplier List{" "}
            <span className="text-muted-foreground">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No suppliers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.phone || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.email || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <ActionMenu
                          onEdit={() => openEdit(s)}
                          onDelete={() => onDelete(s.id, s.name)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <SmallLabel>Name *</SmallLabel>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <SmallLabel>Phone</SmallLabel>
              <Input
                value={form.phone ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <SmallLabel>Email</SmallLabel>
              <Input
                value={form.email ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenForm(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button onClick={save} type="button">
              {editingId ? "Save Changes" : "Create Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}

/* ========================== DEPARTMENTS TAB ========================== */

function DepartmentsTab(props: {
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  onDelete: (id: string, label: string) => void;
}) {
  const { departments, setDepartments, onDelete } = props;

  const [q, setQ] = React.useState("");
  const [openForm, setOpenForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const emptyForm: Omit<Department, "id" | "createdAt"> = {
    name: "",
    code: "",
  };
  const [form, setForm] = React.useState(emptyForm);

  const filtered = React.useMemo(() => {
    const text = q.trim().toLowerCase();
    return departments.filter(
      (d) => !text || `${d.name} ${d.code}`.toLowerCase().includes(text),
    );
  }, [departments, q]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpenForm(true);
  };

  const openEdit = (d: Department) => {
    setEditingId(d.id);
    setForm({ name: d.name, code: d.code });
    setOpenForm(true);
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "Department name is required.";
    if (!form.code.trim()) return "Department code is required.";
    return null;
  };

  const save = () => {
    const err = validate();
    if (err) return alert(err);

    if (editingId) {
      setDepartments((p) =>
        p.map((x) => (x.id === editingId ? { ...x, ...form } : x)),
      );
    } else {
      setDepartments((p) => [
        {
          id: genId("dept"),
          createdAt: new Date().toISOString().slice(0, 10),
          ...form,
        },
        ...p,
      ]);
    }
    setOpenForm(false);
  };

  return (
    <TabsContent value="departments" className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Departments</CardTitle>
              <SmallLabel>Used for employee grouping and reporting</SmallLabel>
            </div>
            <Button onClick={openAdd} className="gap-2" type="button">
              <Plus className="h-4 w-4" /> Add Department
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <SmallLabel>Search</SmallLabel>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="name, code..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Department List{" "}
            <span className="text-muted-foreground">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No departments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.code}
                      </TableCell>
                      <TableCell className="text-right">
                        <ActionMenu
                          onEdit={() => openEdit(d)}
                          onDelete={() =>
                            onDelete(d.id, `${d.name} (${d.code})`)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Department" : "Add Department"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <SmallLabel>Name *</SmallLabel>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <SmallLabel>Code *</SmallLabel>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((p) => ({ ...p, code: e.target.value }))
                }
                placeholder="FIN / IT / HR"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenForm(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button onClick={save} type="button">
              {editingId ? "Save Changes" : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}

/* ========================== LOCATIONS TAB ========================== */

function LocationsTab(props: {
  locations: Location[];
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;
  onDelete: (id: string, label: string) => void;
}) {
  const { locations, setLocations, onDelete } = props;

  const [q, setQ] = React.useState("");
  const [openForm, setOpenForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const emptyForm: Omit<Location, "id" | "createdAt"> = { name: "", code: "" };
  const [form, setForm] = React.useState(emptyForm);

  const filtered = React.useMemo(() => {
    const text = q.trim().toLowerCase();
    return locations.filter(
      (l) => !text || `${l.name} ${l.code}`.toLowerCase().includes(text),
    );
  }, [locations, q]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpenForm(true);
  };

  const openEdit = (l: Location) => {
    setEditingId(l.id);
    setForm({ name: l.name, code: l.code });
    setOpenForm(true);
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "Location name is required.";
    if (!form.code.trim()) return "Location code is required.";
    return null;
  };

  const save = () => {
    const err = validate();
    if (err) return alert(err);

    if (editingId) {
      setLocations((p) =>
        p.map((x) => (x.id === editingId ? { ...x, ...form } : x)),
      );
    } else {
      setLocations((p) => [
        {
          id: genId("loc"),
          createdAt: new Date().toISOString().slice(0, 10),
          ...form,
        },
        ...p,
      ]);
    }
    setOpenForm(false);
  };

  return (
    <TabsContent value="locations" className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Locations</CardTitle>
              <SmallLabel>Offices/branches where assets are stored</SmallLabel>
            </div>
            <Button onClick={openAdd} className="gap-2" type="button">
              <Plus className="h-4 w-4" /> Add Location
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <SmallLabel>Search</SmallLabel>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="name, code..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Location List{" "}
            <span className="text-muted-foreground">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No locations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {l.code}
                      </TableCell>
                      <TableCell className="text-right">
                        <ActionMenu
                          onEdit={() => openEdit(l)}
                          onDelete={() =>
                            onDelete(l.id, `${l.name} (${l.code})`)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Location" : "Add Location"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <SmallLabel>Name *</SmallLabel>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <SmallLabel>Code *</SmallLabel>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((p) => ({ ...p, code: e.target.value }))
                }
                placeholder="HQ-CMB / FAC-KDY"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenForm(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button onClick={save} type="button">
              {editingId ? "Save Changes" : "Create Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
