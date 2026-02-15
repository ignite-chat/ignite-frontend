import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import api from '../../api';

// Sample roles and permissions data structure
const rolesList = [
  { id: 'role1', name: 'Admin' },
  { id: 'role2', name: 'Moderator' },
  { id: 'role3', name: 'Member' },
];

const permissionsList = [
  { name: 'Read Messages', state: 'inherit' },
  { name: 'Send Messages', state: 'inherit' },
  { name: 'Delete Messages', state: 'inherit' },
];

const PermissionsList = ({ permissions, onPermissionChange }) => {
  const getPermissionState = (index) => {
    if (!permissions) {
      return null;
    }

    return permissions[index] || null;
  };

  return (
    <div className="space-y-3">
      {permissionsList.map((permission, index) => (
        <div key={index} className="flex items-center justify-between rounded-lg border border-white/5 bg-background p-3">
          <span className="text-sm font-medium">{permission.name}</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={getPermissionState(index) === 'revoke' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => onPermissionChange(index, 'revoke')}
            >
              Revoke
            </Button>
            <Button
              type="button"
              variant={getPermissionState(index) === null ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => onPermissionChange(index, null)}
            >
              Inherit
            </Button>
            <Button
              type="button"
              variant={getPermissionState(index) === 'grant' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPermissionChange(index, 'grant')}
            >
              Grant
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

const ChannelDialog = ({ open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRole, setSelectedRole] = useState(rolesList[0].id);
  const [permissions, setPermissions] = useState({});

  const handlePermissionChange = (index, state) => {
    const newRolePermissions = permissions[selectedRole] || {};

    newRolePermissions[index] = state;

    setPermissions({
      ...permissions,
      [selectedRole]: newRolePermissions,
    });
  };

  const savePermissions = () => {
    for (const role in permissions) {
      const permissionData = permissions[role];

      let grantedPermissionBits = 0;
      let revokedPermissionBits = 0;

      for (const index in permissionData) {
        const state = permissionData[index];
        if (state === 'grant') {
          grantedPermissionBits |= 1 << index;
        } else if (state === 'revoke') {
          revokedPermissionBits |= 1 << index;
        }
      }

      api
        .put(`/channels/${selectedRole}/permissions/${selectedRole}`, {
          granted: grantedPermissionBits,
          revoked: revokedPermissionBits,
        })
        .then((response) => {
          console.log(response.data);
        })
        .catch((error) => {
          console.error(error);
        });
    }

    console.log(permissions);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Channel Settings</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="delete">Delete Channel</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="rounded-lg border border-white/5 bg-background p-4">
              <p className="text-sm text-muted-foreground">Overview content here</p>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="mt-4 space-y-4">
            <div className="flex gap-2 overflow-x-auto">
              {rolesList.map((role) => (
                <Button
                  key={role.id}
                  type="button"
                  variant={selectedRole === role.id ? 'default' : 'outline'}
                  onClick={() => setSelectedRole(role.id)}
                >
                  {role.name}
                </Button>
              ))}
            </div>

            <PermissionsList
              permissions={permissions[selectedRole]}
              onPermissionChange={handlePermissionChange}
            />

            <div className="flex justify-end">
              <Button onClick={savePermissions}>Save Permissions</Button>
            </div>
          </TabsContent>

          <TabsContent value="delete" className="mt-4">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">Delete Channel content here</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ChannelDialog;
