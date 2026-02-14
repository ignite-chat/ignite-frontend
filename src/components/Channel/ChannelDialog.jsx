import React, { useState } from 'react';
import './ChannelDialog.css'; // Assuming you have a CSS file for styling
import api from '../../api';

// Sample roles and permissions data structure
const rolesList = [
  { id: 'role1', name: 'Admin' },
  { id: 'role2', name: 'Moderator' },
  { id: 'role3', name: 'Member' },
  // Add more roles as needed
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
    <>
      {permissionsList.map((permission, index) => (
        <div key={index}>
          <span>{permission.name}</span>
          <input
            type="radio"
            name={permission.name}
            checked={getPermissionState(index) == 'revoke'}
            onChange={() => onPermissionChange(index, 'revoke')}
          />{' '}
          Revoke
          <input
            type="radio"
            name={permission.name}
            checked={getPermissionState(index) == null}
            onChange={() => onPermissionChange(index, null)}
          />{' '}
          Inherit
          <input
            type="radio"
            name={permission.name}
            checked={getPermissionState(index) == 'grant'}
            onChange={() => onPermissionChange(index, 'grant')}
          />{' '}
          Grant
        </div>
      ))}
    </>
  );
};

const ChannelDialog = ({ isOpen, setIsOpen }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRole, setSelectedRole] = useState(rolesList[0].id); // Default to the first role
  const [permissions, setPermissions] = useState({});

  // const handlePermissionChange = (role, index, state) => {
  //     // const newPermissions = { ...permissions };
  //     // newPermissions[role][index].state = state;
  //     // setPermissions(newPermissions);

  //     // const newPermissions = permissionBits;
  //     // newPermissions[role] = permissionBits[role] || 0;
  //     // const bit = 1 << index;
  //     // if (state === 'revoke') {
  //     //     permissionBits[role] &= ~bit;
  //     // } else if (state === 'grant') {
  //     //     permissionBits[role] |= bit;
  //     // }

  //     const newPermissions = permissions;
  //     const newRolePermissions = newPermissions[role] || {};
  //     newRolePermissions[index] = state;

  //     newPermissions[role] = newRolePermissions;

  //     console.log(newPermissions);
  //     setPermissions(newPermissions);
  // };

  // const savePermissions = () => {
  //     // Modify this function to handle permissions for the selected role
  //     // This example assumes you have a way to identify the channel and roles on your backend
  // };

  const handlePermissionChange = (index, state) => {
    const newRolePermissions = permissions[selectedRole] || {};

    newRolePermissions[index] = state;

    setPermissions({
      ...permissions,
      [selectedRole]: newRolePermissions,
    });
  };

  const savePermissions = () => {
    // Iterate over the permissions object and send the data to the backend
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

      // Send the data to the backend
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

    // api.put(`/channels/${selectedRole}/permissions/${selectedRole}`, permissions[selectedRole]).then((response) => {
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={activeTab === 'overview' ? 'active' : ''}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={activeTab === 'permissions' ? 'active' : ''}
          >
            Permissions
          </button>
          <button
            onClick={() => setActiveTab('delete')}
            className={activeTab === 'delete' ? 'active' : ''}
          >
            Delete Channel
          </button>
        </div>
        <div className="tab-content">
          {activeTab === 'overview' && <div>Overview content here</div>}
          {activeTab === 'permissions' && (
            <div className="permissions-container">
              <div className="role-tabs">
                {rolesList.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={selectedRole === role.id ? 'active' : ''}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
              <div className="role-permissions">
                {/* {permissionsList.map((permission, index) => (
                                    <div key={index}>
                                        <span>{permission.name}</span>
                                        <input type="radio" name={permission.name} checked={permissions[selectedRole][index] == 'revoke'} onChange={() => handlePermissionChange(selectedRole, index, 'revoke')} /> Revoke
                                        <input type="radio" name={permission.name} checked={permissions[selectedRole][index] == null} onChange={() => handlePermissionChange(selectedRole, index, null)} /> Inherit
                                        <input type="radio" name={permission.name} checked={permissions[selectedRole][index] == 'grant'} onChange={() => handlePermissionChange(selectedRole, index, 'grant')} /> Grant
                                    </div>
                                ))} */}

                <PermissionsList
                  permissions={permissions[selectedRole]}
                  onPermissionChange={handlePermissionChange}
                />
              </div>
              <button onClick={savePermissions}>Save Permissions</button>
            </div>
          )}
          {activeTab === 'delete' && <div>Delete Channel content here</div>}
        </div>
      </div>
      <button className="close-btn" onClick={() => setIsOpen(false)}>
        Close
      </button>
    </div>
  );
};

export default ChannelDialog;
