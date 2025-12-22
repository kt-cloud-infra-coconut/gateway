import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

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
};

type LogListResponse = {
  logs: AccessLog[];
  total: number;
  limit: number;
  offset: number;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/_gateback/admin${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
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
    p?.rateLimitWindowSec?.toString() ?? ''
  );
  const [max, setMax] = useState<string>(p?.rateLimitMax?.toString() ?? '');

  return (
    <TableRow>
      <TableCell>
        <div className='font-medium'>{row.service.name}</div>
        <div className='text-xs text-muted-foreground'>{row.service.host}</div>
      </TableCell>
      <TableCell>
        <Switch
          checked={allow ?? row.service.defaultAllow}
          onCheckedChange={(checked) => setAllow(checked)}
        />
      </TableCell>
      <TableCell>
        <div className='flex items-center gap-2'>
          <Input
            className='h-9 w-28'
            placeholder={(
              row.service.defaultRateLimitWindowSec ?? 60
            ).toString()}
            value={win}
            onChange={(e) => setWin(e.target.value)}
          />
          <span className='text-xs text-muted-foreground'>sec</span>
          <Input
            className='h-9 w-28'
            placeholder={(row.service.defaultRateLimitMax ?? 60).toString()}
            value={max}
            onChange={(e) => setMax(e.target.value)}
          />
        </div>
      </TableCell>
      <TableCell className='text-right'>
        <Button
          size='sm'
          onClick={async () => {
            try {
              const body = {
                allow,
                rateLimitWindowSec: win.trim() ? Number(win) : null,
                rateLimitMax: max.trim() ? Number(max) : null,
              };
              await apiFetch(`/users/${userId}/policies/${row.service.id}`, {
                method: 'PUT',
                body: JSON.stringify(body),
              });
              toast.success('Saved');
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
  const [userQuery, setUserQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [policies, setPolicies] = useState<UserPolicyRow[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);

  const servicesById = useMemo(
    () => new Map(services.map((s) => [s.id, s])),
    [services]
  );

  const loadServices = async () => {
    const data = await apiFetch<Service[]>('/services');
    setServices(data);
  };

  const loadUsers = async () => {
    const qs = new URLSearchParams();
    if (userQuery.trim()) qs.set('q', userQuery.trim());
    const data = await apiFetch<UserListResponse>(`/users?${qs.toString()}`);
    setUsers(data.users);
  };

  const loadLogs = async () => {
    const data = await apiFetch<LogListResponse>('/logs');
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
    <div className='mx-auto w-full max-w-6xl p-6'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Admin</h1>
          <p className='text-sm text-muted-foreground'>
            유저/서비스 권한, 레이트리밋, 접속 로그를 관리합니다.
          </p>
        </div>
        <Button
          variant='outline'
          onClick={() => {
            void Promise.all([loadServices(), loadUsers(), loadLogs()]).catch(
              (e) => toast.error(e.message)
            );
          }}
        >
          새로고침
        </Button>
      </div>

      <Tabs defaultValue='users' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='users'>Users</TabsTrigger>
          <TabsTrigger value='services'>Services</TabsTrigger>
          <TabsTrigger value='logs'>Access Logs</TabsTrigger>
        </TabsList>

        <TabsContent value='users'>
          <Card>
            <CardHeader className='space-y-1'>
              <CardTitle>Users</CardTitle>
              <div className='flex gap-2'>
                <Input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder='Search by email or name...'
                />
                <Button
                  onClick={() =>
                    void loadUsers().catch((e) => toast.error(e.message))
                  }
                >
                  Search
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className='font-medium'>{u.email}</TableCell>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.role ?? '-'}</TableCell>
                        <TableCell>
                          {u.banned ? (
                            <Badge variant='destructive'>banned</Badge>
                          ) : (
                            <Badge variant='secondary'>active</Badge>
                          )}
                        </TableCell>
                        <TableCell className='text-right'>
                          <Dialog
                            open={selectedUser?.id === u.id}
                            onOpenChange={(open) => {
                              if (!open) setSelectedUser(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant='outline'
                                size='sm'
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
                            <DialogContent className='max-w-3xl'>
                              <DialogHeader>
                                <DialogTitle>User Access Controls</DialogTitle>
                              </DialogHeader>

                              {selectedUser && (
                                <div className='space-y-4'>
                                  <div className='flex items-center justify-between rounded-md border p-3'>
                                    <div>
                                      <div className='font-medium'>
                                        {selectedUser.email}
                                      </div>
                                      <div className='text-sm text-muted-foreground'>
                                        {selectedUser.name}
                                      </div>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                      <Label className='text-sm'>Admin</Label>
                                      <Switch
                                        checked={(
                                          selectedUser.role ?? ''
                                        ).includes('admin')}
                                        onCheckedChange={async (checked) => {
                                          try {
                                            const nextRole = checked
                                              ? 'admin'
                                              : null;
                                            await apiFetch(
                                              `/users/${selectedUser.id}/role`,
                                              {
                                                method: 'PATCH',
                                                body: JSON.stringify({
                                                  role: nextRole,
                                                }),
                                              }
                                            );
                                            setSelectedUser({
                                              ...selectedUser,
                                              role: nextRole,
                                            });
                                            toast.success('Role updated');
                                            void loadUsers();
                                          } catch (e: any) {
                                            toast.error(e.message);
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div className='rounded-md border'>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Service</TableHead>
                                          <TableHead>Allow</TableHead>
                                          <TableHead>
                                            RateLimit (window/max)
                                          </TableHead>
                                          <TableHead className='text-right'>
                                            Save
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
                                              void loadPolicies(selectedUser.id)
                                            }
                                          />
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              )}

                              <DialogFooter>
                                <Button
                                  variant='outline'
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

        <TabsContent value='services'>
          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='rounded-md border'>
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
                        <TableCell className='font-medium'>{s.host}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              s.defaultAllow ? 'secondary' : 'destructive'
                            }
                          >
                            {s.defaultAllow ? 'allow' : 'deny'}
                          </Badge>
                          <span className='ml-2 text-xs text-muted-foreground'>
                            {s.defaultRateLimitWindowSec ?? '-'}s /{' '}
                            {s.defaultRateLimitMax ?? '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className='mt-3 text-xs text-muted-foreground'>
                서비스 업스트림(host→upstream)은 env(`GATEWAY_PROXY_MAP` 또는
                `GATEWAY_SERVICES`)에서 관리됩니다. 여기서는 기본 allow 및 기본
                레이트리밋만 조정합니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='logs'>
          <Card>
            <CardHeader>
              <CardTitle>Access Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className='text-xs'>
                          {new Date(l.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className='text-xs'>{l.host}</TableCell>
                        <TableCell className='text-xs'>{l.path}</TableCell>
                        <TableCell className='text-xs'>{l.method}</TableCell>
                        <TableCell className='text-xs'>
                          <Badge
                            variant={
                              l.status >= 400 ? 'destructive' : 'secondary'
                            }
                          >
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-xs'>
                          {l.blockedReason ?? '-'}
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
