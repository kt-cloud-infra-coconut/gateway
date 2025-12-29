import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type Service = {
  id: string;
  host: string;
  upstream: string;
  name: string;
  defaultAllow: boolean;
  defaultRateLimitWindowSec: number | null;
  defaultRateLimitMax: number | null;
};

type User = {
  id: string;
  email: string;
  name: string;
  role: string | null;
  banned: boolean | null;
  createdAt: string;
};

type UserListResponse = {
  users: User[];
  total: number;
  limit: number;
  offset: number;
};

type UserPolicyRow = {
  service: Service;
  policy: {
    id: string;
    allow: boolean | null;
    rateLimitWindowSec: number | null;
    rateLimitMax: number | null;
  } | null;
};

type AccessLog = {
  id: string;
  createdAt: string;
  host: string;
  path: string;
  method: string;
  status: number;
  upstream: string | null;
  blockedReason: string | null;
  userId: string | null;
  serviceId: string | null;
  ip: string | null;
  geoCountry: string | null;
  geoCity: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
};

type LogListResponse = {
  logs: AccessLog[];
  total: number;
  limit: number;
  offset: number;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/_gateback/admin${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

function getFlagEmoji(countryCode: string | null) {
  if (!countryCode) return "";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function PolicyEditorRow({
  row,
  userId,
  onSaved,
}: {
  row: UserPolicyRow;
  userId: string;
  onSaved: () => void;
}) {
  const p = row.policy;
  const [allow, setAllow] = useState<boolean | null>(p?.allow ?? null);
  const [win, setWin] = useState<string>(
    p?.rateLimitWindowSec?.toString() ?? ""
  );
  const [max, setMax] = useState<string>(p?.rateLimitMax?.toString() ?? "");

  return (
    <TableRow>
      <TableCell className="align-top">
        <div className="font-medium">{row.service.name}</div>
        <div className="text-xs text-muted-foreground">{row.service.host}</div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex items-center gap-2">
          <Switch
            checked={allow ?? row.service.defaultAllow}
            onCheckedChange={(checked) => setAllow(checked)}
          />
          <span className="text-xs text-muted-foreground">
            {allow === null ? "(Default)" : allow ? "Allow" : "Deny"}
          </span>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-12 text-xs text-muted-foreground">Window</span>
            <Input
              className="h-8 w-24"
              placeholder={(
                row.service.defaultRateLimitWindowSec ?? 60
              ).toString()}
              value={win}
              onChange={(e) => setWin(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">sec</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-12 text-xs text-muted-foreground">Max</span>
            <Input
              className="h-8 w-24"
              placeholder={(row.service.defaultRateLimitMax ?? 60).toString()}
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">reqs</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right align-top">
        <Button
          size="sm"
          onClick={async () => {
            try {
              const body = {
                allow,
                rateLimitWindowSec: win.trim() ? Number(win) : null,
                rateLimitMax: max.trim() ? Number(max) : null,
              };
              await apiFetch(`/users/${userId}/policies/${row.service.id}`, {
                method: "PUT",
                body: JSON.stringify(body),
              });
              toast.success("Saved");
              onSaved();
            } catch (e: any) {
              toast.error(e.message);
            }
          }}
        >
          Save
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function AdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [policies, setPolicies] = useState<UserPolicyRow[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);

  const loadServices = async () => {
    const data = await apiFetch<Service[]>("/services");
    setServices(data);
  };

  const loadUsers = async () => {
    const qs = new URLSearchParams();
    if (userQuery.trim()) qs.set("q", userQuery.trim());
    const data = await apiFetch<UserListResponse>(`/users?${qs.toString()}`);
    setUsers(data.users);
  };

  const loadLogs = async () => {
    const data = await apiFetch<LogListResponse>("/logs");
    setLogs(data.logs);
  };

  const loadPolicies = async (userId: string) => {
    const data = await apiFetch<UserPolicyRow[]>(`/users/${userId}/policies`);
    setPolicies(data);
  };

  useEffect(() => {
    void loadServices().catch((e) => toast.error(e.message));
    void loadUsers().catch((e) => toast.error(e.message));
    void loadLogs().catch((e) => toast.error(e.message));
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gateway Admin</h1>
          <p className="text-sm text-muted-foreground">
            User management, Service policies, and Traffic logs
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void Promise.all([loadServices(), loadUsers(), loadLogs()]).catch(
              (e) => toast.error(e.message)
            );
          }}
        >
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="logs">Access Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle>Users</CardTitle>
                <div className="flex w-full max-w-sm gap-2">
                  <Input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Search email..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        void loadUsers().catch((e) => toast.error(e.message));
                    }}
                  />
                  <Button
                    onClick={() =>
                      void loadUsers().catch((e) => toast.error(e.message))
                    }
                  >
                    Search
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium">{u.email}</div>
                          <div className="text-xs text-muted-foreground">
                            {u.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{u.role ?? "user"}</Badge>
                        </TableCell>
                        <TableCell>
                          {u.banned ? (
                            <Badge variant="destructive">banned</Badge>
                          ) : (
                            <Badge variant="secondary">active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog
                            open={selectedUser?.id === u.id}
                            onOpenChange={(open) => {
                              if (!open) setSelectedUser(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(u);
                                  void loadPolicies(u.id).catch((e) =>
                                    toast.error(e.message)
                                  );
                                }}
                              >
                                Manage
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-5xl">
                              <DialogHeader>
                                <DialogTitle>User Access Controls</DialogTitle>
                              </DialogHeader>

                              {selectedUser && (
                                <div className="space-y-6">
                                  <div className="flex items-center justify-between rounded-md border bg-muted/40 p-4">
                                    <div>
                                      <div className="font-bold">
                                        {selectedUser.email}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        ID: {selectedUser.id}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        <Label>Admin Role</Label>
                                        <Switch
                                          checked={(
                                            selectedUser.role ?? ""
                                          ).includes("admin")}
                                          onCheckedChange={async (checked) => {
                                            try {
                                              const nextRole = checked
                                                ? "admin"
                                                : null;
                                              await apiFetch(
                                                `/users/${selectedUser.id}/role`,
                                                {
                                                  method: "PATCH",
                                                  body: JSON.stringify({
                                                    role: nextRole,
                                                  }),
                                                }
                                              );
                                              setSelectedUser({
                                                ...selectedUser,
                                                role: nextRole,
                                              });
                                              toast.success("Role updated");
                                              void loadUsers();
                                            } catch (e: any) {
                                              toast.error(e.message);
                                            }
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h3 className="mb-2 text-lg font-semibold">
                                      Service Policies
                                    </h3>
                                    <div className="rounded-md border">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="w-[250px]">
                                              Service
                                            </TableHead>
                                            <TableHead className="w-[150px]">
                                              Access
                                            </TableHead>
                                            <TableHead>Rate Limits</TableHead>
                                            <TableHead className="w-[100px] text-right">
                                              Action
                                            </TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {policies.map((row) => (
                                            <PolicyEditorRow
                                              key={row.service.id}
                                              row={row}
                                              userId={selectedUser.id}
                                              onSaved={() =>
                                                void loadPolicies(
                                                  selectedUser.id
                                                )
                                              }
                                            />
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setSelectedUser(null)}
                                >
                                  Close
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Host</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Defaults</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.host}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                s.defaultAllow ? "secondary" : "destructive"
                              }
                            >
                              {s.defaultAllow ? "Allow" : "Deny"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {s.defaultRateLimitWindowSec
                                ? `${s.defaultRateLimitWindowSec}s / ${s.defaultRateLimitMax}reqs`
                                : "No Limit"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Access Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Time</TableHead>
                      <TableHead className="w-[200px]">Client</TableHead>
                      <TableHead className="w-[200px]">Location</TableHead>
                      <TableHead>Request</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="align-top text-xs">
                          {format(new Date(l.createdAt), "yyyy-MM-dd HH:mm:ss")}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-medium">
                              {l.ip || "Unknown IP"}
                            </span>
                            <span className="text-muted-foreground">
                              {l.browser}
                            </span>
                            <span className="text-muted-foreground">
                              {l.os}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-lg">
                              {getFlagEmoji(l.geoCountry)}
                            </span>
                            <div className="flex flex-col">
                              <span>{l.geoCountry || "-"}</span>
                              <span className="text-muted-foreground">
                                {l.geoCity}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs font-medium">
                              <Badge variant="outline">{l.method}</Badge>
                              <span>{l.host}</span>
                            </div>
                            <div className="break-all text-xs text-muted-foreground">
                              {l.path}
                            </div>
                            {l.blockedReason && (
                              <Badge
                                variant="destructive"
                                className="w-fit text-[10px]"
                              >
                                Blocked: {l.blockedReason}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge
                            variant={
                              l.status >= 400
                                ? "destructive"
                                : l.status >= 300
                                ? "secondary"
                                : "default"
                            }
                          >
                            {l.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
