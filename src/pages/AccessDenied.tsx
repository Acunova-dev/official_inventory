import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_DEFINITIONS, AppRole } from "../types/rbac";
import { ShieldAlert, ArrowLeft, Lock, CheckCircle2, Shield, UserCheck, KeyRound } from "lucide-react";

interface AccessDeniedProps {
  requiredPermission?: string;
  moduleName?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ 
  requiredPermission = "restricted_action",
  moduleName = "Requested Module"
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const currentRole = (user?.role || "Sales Person") as AppRole;
  const roleDef = ROLE_DEFINITIONS[currentRole] || ROLE_DEFINITIONS["Sales Person"];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* 403 Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 text-white pointer-events-none">
          <ShieldAlert size={280} />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold uppercase tracking-wider">
            <Lock size={14} />
            <span>HTTP 403 Forbidden • Access Control Exception</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white">
            Access Restricted to {moduleName}
          </h1>

          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Your current assigned role (<strong>{currentRole}</strong>) does not have authorization to view or execute operations within this workspace section. 
            Required system permission key: <code className="bg-slate-800 px-2 py-0.5 rounded text-amber-400 font-mono text-xs">{requiredPermission}</code>.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl border border-slate-700 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft size={16} />
              <span>Go Back</span>
            </button>

            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all"
            >
              <span>Return to My Dashboard</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Role Capabilities vs Scope Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Your Role Scope */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Shield className="text-blue-600" size={20} />
              <h2 className="font-extrabold text-slate-900 text-base">Your Active Role Scope</h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${roleDef.badgeColor}`}>
              {currentRole}
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {roleDef.description}
          </p>

          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Granted Operational Modules:</p>
            <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
              {roleDef.permissions.slice(0, 7).map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span className="font-mono">{p}</span>
                </li>
              ))}
              {roleDef.permissions.length > 7 && (
                <li className="text-slate-400 font-mono text-[11px] pt-1">
                  + {roleDef.permissions.length - 7} additional permissions
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Request Permission Notice */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60">
            <KeyRound className="text-blue-600" size={20} />
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">Request Elevated Access</h2>
              <p className="text-xs text-slate-500">How to unlock access to {moduleName}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <p>
              System permissions in Acu-invent are strictly managed by your organization's Principal Administrator using Role-Based Access Control (RBAC).
            </p>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5 font-mono text-[11px]">
              <p className="text-slate-400 uppercase font-bold text-[10px]">Permission Key Required:</p>
              <p className="text-blue-600 font-bold">{requiredPermission}</p>
              <p className="text-slate-400 uppercase font-bold text-[10px] pt-1">Logged In Account:</p>
              <p className="text-slate-700">{user?.email || "Authenticated User"}</p>
            </div>
            <p className="text-slate-500">
              If you require access to this section for your daily workflow, please contact an Administrator to update your role or grant a custom permission override.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
