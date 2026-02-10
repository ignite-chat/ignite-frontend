import { useEffect, useMemo, useState } from 'react';
import { X, Info, Lock, FloppyDisk, Check } from '@phosphor-icons/react';
import { InputGroup, InputGroupInput } from '../ui/input-group';
import { useGuildsStore } from '../../store/guilds.store';
import { ChannelsService } from '../../services/channels.service';
import { Slash } from 'lucide-react';

const permissions = {
    2: "Manage Guild",     // 2
    4: "Manage Channels",  // 4
    8: "Manage Messages",  // 8
    16: "Kick Members",     // 16
    32: "Ban Members"       // 32
};

const OverviewTab = ({ guild, channel }) => {
    const store = useGuildsStore();

    const [name, setName] = useState(channel?.name || '');
    const [description, setDescription] = useState(channel?.description || '');
    const [isSaving, setIsSaving] = useState(false);

    // Update local state if the channel prop changes externally
    useEffect(() => {
        setName(channel?.name || '');
        setDescription(channel?.description || '');
    }, [channel]);

    const hasChanged = useMemo(() => {
        return name !== (channel?.name || '') || description !== (channel?.description || '');
    }, [name, description, channel]);

    const handleSave = () => {
        if (!hasChanged) return;
        setIsSaving(true);

        ChannelsService.updateGuildChannel(guild.id, channel.channel_id, {
            name,
            description,
        })
            .then(() => {
                // Success feedback handled by parent or toast
            })
            .catch(() => {
                // Error handling via service logs or toast
            })
            .finally(() => {
                setIsSaving(false);
            });
    };

    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-gray-800 bg-gray-900">
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-700 bg-gray-900/50">
                <div className="flex flex-col gap-6 max-w-lg">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-100 mb-1">
                            Channel Overview
                        </h3>
                        <p className="text-xs text-gray-400 mb-6">
                            Edit the basic details of this channel.
                        </p>
                    </div>

                    <div>
                        <div className="mb-2 text-xs font-bold text-gray-400 uppercase tracking-wide">
                            Channel Name
                        </div>
                        <InputGroup>
                            <InputGroupInput
                                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Enter channel name"
                                required
                            />
                        </InputGroup>
                    </div>

                    <div>
                        <div className="mb-2 text-xs font-bold text-gray-400 uppercase tracking-wide">
                            Channel Description
                        </div>
                        <InputGroup>
                            <InputGroupInput
                                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Enter channel description"
                            />
                        </InputGroup>
                    </div>
                </div>
            </div>

            {/* Floating Action Bar */}
            <div className={`border-t border-gray-800 bg-gray-900 p-4 transition-all duration-300 ${hasChanged ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-2 pointer-events-none'}`}>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                        {hasChanged ? 'Careful - you have unsaved changes!' : 'Channel settings'}
                    </span>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanged || isSaving}
                        className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-medium text-white transition-colors ${hasChanged
                            ? 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20'
                            : 'bg-gray-700 cursor-not-allowed opacity-50'
                            }`}
                    >
                        <FloppyDisk size={18} />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PermissionRow = ({ label, state, onAllow, onDeny, onReset }) => {
    return (
        <div className="flex items-center justify-between py-3 px-2 hover:bg-gray-800/40 rounded transition-colors">
            <span className="text-sm font-medium text-gray-200">{label}</span>
            <div className="flex items-center shadow-sm">
                {/* Deny Button */}
                <button
                    type="button"
                    onClick={onDeny}
                    className={`flex h-8 w-8 items-center justify-center rounded-l border border-r-0 transition-all ${state === 0
                        ? 'bg-red-500/20 border-red-500 text-red-500'
                        : 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700 hover:text-red-400'
                        }`}
                >
                    <X weight="bold" size={14} />
                </button>

                {/* Neutral/Reset Button */}
                <button
                    type="button"
                    onClick={onReset}
                    className={`flex h-8 w-8 items-center justify-center border transition-all ${state === 1
                        ? 'bg-gray-600/30 border-gray-500 text-gray-200'
                        : 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
                        }`}
                >
                    <Slash weight="bold" size={14} />
                </button>

                {/* Allow Button */}
                <button
                    type="button"
                    onClick={onAllow}
                    className={`flex h-8 w-8 items-center justify-center rounded-r border border-l-0 transition-all ${state === 2
                        ? 'bg-green-500/20 border-green-500 text-green-500'
                        : 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700 hover:text-green-400'
                        }`}
                >
                    <Check weight="bold" size={14} />
                </button>
            </div>
        </div>
    );
};

const PermissionsTab = ({ guild, channel }) => {
    const store = useGuildsStore();
    const [selectedRoleId, setSelectedRoleId] = useState();
    const rolesList = guild?.roles ?? [];
    const [savedPermissionsByRole, setSavedPermissionsByRole] = useState({});

    // Track if changes have been made locally
    const [isSaving, setIsSaving] = useState(false);

    const [allowedPermissions, setAllowedPermissions] = useState(0);
    const [deniedPermissions, setDeniedPermissions] = useState(0);

    const hasChanged = useMemo(() => {
        const savedPerm = savedPermissionsByRole[selectedRoleId];
        const rolePerm = channel?.role_permissions?.find(rp => rp.role_id === selectedRoleId);
        const baselinePerm = savedPerm || rolePerm;
        if (!baselinePerm) {
            return allowedPermissions !== 0 || deniedPermissions !== 0;
        }
        return allowedPermissions !== Number(baselinePerm.allowed_permissions) ||
            deniedPermissions !== Number(baselinePerm.denied_permissions);
    }, [allowedPermissions, deniedPermissions, selectedRoleId, channel, savedPermissionsByRole]);

    // Load initial permissions when role changes
    useEffect(() => {
        const savedPerm = savedPermissionsByRole[selectedRoleId];
        const rolePerm = channel?.role_permissions?.find(rp => rp.role_id === selectedRoleId);
        const baselinePerm = savedPerm || rolePerm;
        if (baselinePerm) {
            setAllowedPermissions(Number(baselinePerm.allowed_permissions));
            setDeniedPermissions(Number(baselinePerm.denied_permissions));
        } else {
            setAllowedPermissions(0);
            setDeniedPermissions(0);
        }
    }, [selectedRoleId, channel, savedPermissionsByRole]);

    // Select first role on mount
    useEffect(() => {
        if (rolesList.length > 0 && !selectedRoleId) {
            setSelectedRoleId(rolesList[0]?.id);
        }
    }, [rolesList, selectedRoleId]);

    const handleDenyPermission = (permBit) => {
        setAllowedPermissions(prev => prev & ~permBit);
        setDeniedPermissions(prev => prev | permBit);
    };

    const handleAllowPermission = (permBit) => {
        setAllowedPermissions(prev => prev | permBit);
        setDeniedPermissions(prev => prev & ~permBit);
    };

    const handleResetPermission = (permBit) => {
        setAllowedPermissions(prev => prev & ~permBit);
        setDeniedPermissions(prev => prev & ~permBit);
    };

    // 0 = Denied, 1 = Neutral (inherit), 2 = Allowed
    const getPermissionState = (permBit) => {
        // We cast to Number/Int to ensure bitwise works correctly
        const bit = Number(permBit);
        if (deniedPermissions & bit) return 0;
        if (allowedPermissions & bit) return 2;
        return 1;
    };

    const handleSave = () => {
        setIsSaving(true);
        const permissions = {
            allowed_permissions: allowedPermissions,
            denied_permissions: deniedPermissions,
        };

        ChannelsService.updateChannelPermissions(guild.id, channel.channel_id, selectedRoleId, permissions)
            .then(() => {
                setSavedPermissionsByRole(prev => ({
                    ...prev,
                    [selectedRoleId]: {
                        allowed_permissions: allowedPermissions,
                        denied_permissions: deniedPermissions,
                    },
                }));
            })
            .catch(() => {
                // Error handling
            })
            .finally(() => {
                setIsSaving(false);
            });
    };

    return (
        <div className="flex h-[500px] w-full flex-col overflow-hidden rounded-md border border-gray-800 bg-gray-900 md:flex-row">
            {/* Sidebar: Roles List */}
            <div className="flex w-full flex-col border-b border-gray-800 bg-gray-900 md:w-48 md:border-b-0 md:border-r">
                <div className="p-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                    Roles
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-thumb-gray-700">
                    {rolesList.map((role) => (
                        <button
                            key={role.id}
                            onClick={() => setSelectedRoleId(role.id)}
                            className={`mb-1 flex w-full items-center justify-between rounded px-3 py-2 text-sm font-medium transition-colors ${selectedRoleId === role.id
                                ? 'bg-gray-800 text-white shadow-sm'
                                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                                }`}
                        >
                            <span className="truncate">{role.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content: Permissions List */}
            <div className="relative flex flex-1 flex-col bg-gray-900/50">
                <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-gray-700">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-100">
                            {rolesList.find(r => r.id === selectedRoleId)?.name || 'Role'} Permissions
                        </h3>
                        <p className="text-xs text-gray-400">
                            Configure specific permissions for this role in this channel.
                        </p>
                    </div>

                    <div className="space-y-1">
                        {Object.entries(permissions).map(([bit, permName]) => (
                            <PermissionRow
                                key={bit}
                                label={permName}
                                state={getPermissionState(bit)}
                                onAllow={() => handleAllowPermission(Number(bit))}
                                onDeny={() => handleDenyPermission(Number(bit))}
                                onReset={() => handleResetPermission(Number(bit))}
                            />
                        ))}
                    </div>
                </div>

                {/* Floating Action Bar (Only shows if there are changes) */}
                <div className={`border-t border-gray-800 bg-gray-900 p-4 transition-all duration-300 ${hasChanged ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-2 pointer-events-none'}`}>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                            {hasChanged ? 'Careful - you have unsaved changes!' : 'Permission settings'}
                        </span>
                        <button
                            onClick={handleSave}
                            disabled={!hasChanged || isSaving}
                            className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-medium text-white transition-colors ${hasChanged
                                ? 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20'
                                : 'bg-gray-700 cursor-not-allowed opacity-50'
                                }`}
                        >
                            <FloppyDisk size={18} />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EditGuildChannelModal = ({ isOpen, onClose, guild, initialTab = 'info', channel }) => {
    const [activeTab, setActiveTab] = useState('info');

    const tabs = useMemo(
        () => [
            { id: 'info', label: 'Overview', icon: <Info size={18} />, component: <OverviewTab guild={guild} channel={channel} /> },
            { id: 'roles', label: 'Permissions', icon: <Lock size={18} />, component: <PermissionsTab guild={guild} channel={channel} /> },
        ],
        [guild, channel]
    );

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', onKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) setActiveTab(initialTab || 'info');
    }, [initialTab, isOpen]);

    if (!isOpen || !channel) return null;

    const activeContent = tabs.find((tab) => tab.id === activeTab)?.component;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
            <div className="w-full max-w-5xl overflow-y-auto rounded-lg bg-gray-900 text-gray-100 shadow-2xl max-h-[calc(100vh-1.5rem)]">
                <div className="flex flex-col gap-3 border-b border-gray-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                        <h2 className="text-xl font-bold">#{channel?.name}</h2>
                    </div>
                    <button
                        type="button"
                        className="self-start rounded p-2 text-gray-200 hover:bg-gray-800 sm:self-auto"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="flex min-h-[520px] flex-col md:flex-row">
                    <nav className="w-full shrink-0 border-b border-gray-800 bg-gray-950/40 p-3 md:w-56 md:border-b-0 md:border-r md:p-4">
                        <div className="flex gap-2 overflow-x-auto text-sm font-medium md:block md:space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    className={`flex items-center gap-2 whitespace-nowrap rounded px-3 py-2 text-left transition-colors md:w-full ${activeTab === tab.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60'}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </nav>
                    <div className="flex-1 p-4 sm:p-6">{activeContent}</div>
                </div>
            </div>
        </div>
    );
};

export default EditGuildChannelModal;
