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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import {
  GlobeIcon,
  LaptopIcon,
  ShieldAlertIcon,
  ServerIcon,
  UserIcon,
  Loader2Icon,
} from "lucide-react";

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
  const [saving, setSaving] = useState(false);

  return (
    <TableRow>
      <TableCell className="align-top py-3">
        <div className="font-medium text-sm">{row.service.name}</div>
        <div className="text-xs text-muted-foreground">{row.service.host}</div>
      </TableCell>
      <TableCell className="align-top py-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={allow ?? row.service.defaultAllow}
            onCheckedChange={(checked) => setAllow(checked)}
            disabled={saving}
          />
          <span className="text-xs text-muted-foreground">
            {allow === null ? "(Default)" : allow ? "Allow" : "Deny"}
          </span>
        </div>
      </TableCell>
      <TableCell className="align-top py-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-14 text-xs text-muted-foreground shrink-0">
              Window
            </span>
            <Input
              className="h-8 w-20 text-sm"
              placeholder={(
                row.service.defaultRateLimitWindowSec ?? 60
              ).toString()}
              value={win}
              onChange={(e) => setWin(e.target.value)}
              disabled={saving}
            />
            <span className="text-xs text-muted-foreground shrink-0">sec</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14 text-xs text-muted-foreground shrink-0">
              Max
            </span>
            <Input
              className="h-8 w-20 text-sm"
              placeholder={(row.service.defaultRateLimitMax ?? 60).toString()}
              value={max}
              onChange={(e) => setMax(e.target.value)}
              disabled={saving}
            />
            <span className="text-xs text-muted-foreground shrink-0">reqs</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right align-top py-3">
        <Button
          size="sm"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
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
              toast.success("Policy saved successfully");
              onSaved();
            } catch (e: any) {
              toast.error(e.message || "Failed to save policy");
            } finally {
              setSaving(false);
            }
          }}
          className="h-8 text-xs"
        >
          {saving && <Loader2Icon className="mr-2 h-3 w-3 animate-spin" />}
          {saving ? "Saving..." : "Save"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function DetailItem({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: any;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      <div className="text-sm font-medium break-all">{value || "-"}</div>
    </div>
  );
}

function LogDetailSheet({
  log,
  open,
  onOpenChange,
}: {
  log: AccessLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!log) return null;

  const isError = log.status >= 400;
  const isBlocked = !!log.blockedReason;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b p-6 pb-4">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <SheetTitle className="flex items-center gap-2">
                  Request Details
                  {isBlocked && (
                    <Badge variant="destructive" className="ml-2">
                      Blocked
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription>
                  {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss.SSS")}
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Badge
                variant={isError ? "destructive" : "secondary"}
                className="text-base px-3 py-1.5"
              >
                {log.status}
              </Badge>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="font-bold text-sm">{log.method}</span>
                <span className="text-sm text-muted-foreground">
                  {log.host}
                </span>
              </div>
            </div>
            <div className="font-mono text-sm bg-muted/50 p-3 rounded-md break-all mt-3">
              {log.path}
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Security Alert */}
          {log.blockedReason && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3 border border-destructive/20">
              <ShieldAlertIcon className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">Request Blocked</div>
                <div className="text-sm opacity-90">
                  Reason: {log.blockedReason}
                </div>
              </div>
            </div>
          )}

          {/* Client Information */}
          <section>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <LaptopIcon className="w-4 h-4" /> Client Information
            </h3>
            <div className="grid grid-cols-2 gap-6 p-5 rounded-xl border bg-card">
              <DetailItem label="IP Address" value={log.ip} />
              <DetailItem
                label="Location"
                value={
                  log.geoCountry ? (
                    <span className="flex items-center gap-2">
                      <span className="text-xl">
                        {getFlagEmoji(log.geoCountry)}
                      </span>
                      <span>
                        {log.geoCity ? `${log.geoCity}, ` : ""}
                        {log.geoCountry}
                      </span>
                    </span>
                  ) : (
                    "-"
                  )
                }
                icon={GlobeIcon}
              />
              <DetailItem label="Browser" value={log.browser} />
              <DetailItem label="OS" value={log.os} />
              <DetailItem
                label="Device"
                value={log.device}
                className="col-span-2"
              />
            </div>
          </section>

          {/* Routing */}
          <section>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <ServerIcon className="w-4 h-4" /> Routing
            </h3>
            <div className="grid grid-cols-2 gap-6 p-5 rounded-xl border bg-card">
              <DetailItem label="Service Host" value={log.host} />
              <DetailItem label="Upstream URL" value={log.upstream} />
              <DetailItem label="Service ID" value={log.serviceId} />
              <DetailItem label="Request ID" value={log.id} />
            </div>
          </section>

          {/* Identity */}
          {log.userId && (
            <section>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <UserIcon className="w-4 h-4" /> Identity
              </h3>
              <div className="p-5 rounded-xl border bg-card">
                <DetailItem label="User ID" value={log.userId} />
              </div>
            </section>
          )}

          <Separator />

          <div className="text-xs text-muted-foreground text-center py-2">
            Log ID: {log.id}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function AdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [policies, setPolicies] = useState<UserPolicyRow[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gateway Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">
              User management, Service policies, and Traffic logs
            </p>
          </div>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              void Promise.all([loadServices(), loadUsers(), loadLogs()])
                .then(() => toast.success("Data refreshed"))
                .catch((e) => toast.error(e.message))
                .finally(() => setLoading(false));
            }}
          >
            {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-background border">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="logs">Access Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader className="space-y-3">
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
                          <TableCell className="py-4">
                            <div className="font-medium">{u.email}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {u.name}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline">{u.role ?? "user"}</Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            {u.banned ? (
                              <Badge variant="destructive">banned</Badge>
                            ) : (
                              <Badge variant="secondary">active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-4">
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
                              <DialogContent className="max-w-5xl">
                                <DialogHeader className="pb-3">
                                  <DialogTitle className="text-xl">
                                    User Access Controls
                                  </DialogTitle>
                                </DialogHeader>

                                {selectedUser && (
                                  <div className="space-y-5">
                                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
                                      <div>
                                        <div className="font-semibold">
                                          {selectedUser.email}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                          ID: {selectedUser.id}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <Label className="text-sm font-medium">
                                          Admin Role
                                        </Label>
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
                                              toast.success(
                                                `Role ${
                                                  checked
                                                    ? "granted"
                                                    : "revoked"
                                                } successfully`
                                              );
                                              void loadUsers();
                                            } catch (e: any) {
                                              toast.error(e.message);
                                            }
                                          }}
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <h3 className="mb-3 text-base font-semibold">
                                        Service Policies
                                      </h3>
                                      <div className="rounded-md border max-h-[50vh] overflow-y-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-[200px] h-10">
                                                Service
                                              </TableHead>
                                              <TableHead className="w-[140px] h-10">
                                                Access
                                              </TableHead>
                                              <TableHead className="h-10">
                                                Rate Limits
                                              </TableHead>
                                              <TableHead className="w-[100px] text-right h-10">
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

                                <DialogFooter className="mt-4">
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
                          <TableCell className="font-medium py-4">
                            {s.host}
                          </TableCell>
                          <TableCell className="py-4">{s.name}</TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
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
                        <TableRow
                          key={l.id}
                          className="cursor-pointer hover:bg-muted/60 transition-colors"
                          onClick={() => setSelectedLog(l)}
                        >
                          <TableCell className="align-top text-xs py-4">
                            {format(
                              new Date(l.createdAt),
                              "yyyy-MM-dd HH:mm:ss"
                            )}
                          </TableCell>
                          <TableCell className="align-top py-4">
                            <div className="flex flex-col gap-1 text-xs">
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
                          <TableCell className="align-top py-4">
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
                          <TableCell className="align-top py-4">
                            <div className="flex flex-col gap-1.5">
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
                          <TableCell className="align-top py-4">
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

        <LogDetailSheet
          log={selectedLog}
          open={!!selectedLog}
          onOpenChange={(open) => !open && setSelectedLog(null)}
        />
      </div>
    </div>
  );
}
