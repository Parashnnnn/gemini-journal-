import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Server,
  Database,
  KeyRound,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

export const ThreatModelModal: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const firestoreRulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default fail-closed: deny all access unless explicitly allowed
    match /{document=**} {
      allow read, write: if false;
    }

    // User profile and subcollections strictly isolated by authenticated UID
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Journal entries subcollection
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`;

  const copyRules = () => {
    navigator.clipboard.writeText(firestoreRulesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20 space-y-6">
      {/* Header */}
      <div className="border-b border-stone-200 pb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2 border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Security Constitution Enforced
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-900">
          Security Threat Model & Architecture Audit
        </h2>
        <p className="text-sm text-stone-600 mt-1">
          Verification evidence of trust boundaries, authentication enforcement, Firestore isolation rules, and secret management.
        </p>
      </div>

      {/* 1. Trust Boundaries Diagram */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
          <Server className="w-5 h-5 text-stone-700" />
          1. System Trust Boundaries
        </h3>
        <p className="text-xs text-stone-600 mb-4">
          Four distinct trust zones maintain zero-trust segmentation between untrusted clients and privileged backends.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200">
            <span className="font-bold text-rose-900 block mb-1">Untrusted Client</span>
            <p className="text-rose-800 text-[11px] leading-relaxed">
              Browser environment. Considered hostile. Contains zero secrets, zero direct Gemini API keys.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200">
            <span className="font-bold text-amber-900 block mb-1">Backend Proxy</span>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Cloud Run / Express. Cryptographically verifies Firebase ID tokens, sanitizes prompts, and proxies AI calls.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200">
            <span className="font-bold text-blue-900 block mb-1">Database Layer</span>
            <p className="text-blue-800 text-[11px] leading-relaxed">
              Cloud Firestore. Path-isolated under <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">/users/{`{uid}`}</code> with fail-closed security rules.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200">
            <span className="font-bold text-emerald-900 block mb-1">Secret Manager</span>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              GCP Secret Manager holds <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">GEMINI_API_KEY</code>, injected strictly to backend process runtime.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top 3 Threats & Mitigations */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          2. Top 3 Threats & Verified Mitigations
        </h3>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-stone-900">
                Threat 1: Insecure Direct Object References (IDOR)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                Mitigated
              </span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              <strong>Risk:</strong> An authenticated user queries another user's journal entries by guessing or spoofing a UID.
              <br />
              <strong>Mitigation:</strong> Documents are stored strictly under <code className="bg-stone-200 px-1 py-0.5 rounded font-mono">/users/{`{userId}`}/entries/{`{entryId}`}</code>. Firestore Security Rules enforce <code className="bg-stone-200 px-1 py-0.5 rounded font-mono">request.auth.uid == userId</code> at the database engine level, impossible to bypass from the frontend.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-stone-900">
                Threat 2: Gemini API Key Leakage & Abuse
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                Mitigated
              </span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              <strong>Risk:</strong> Gemini API keys placed in frontend JS bundles or Network payloads, leading to theft and Denial of Wallet.
              <br />
              <strong>Mitigation:</strong> Frontend never receives, stores, or transmits the Gemini API key. All calls route to server endpoint <code className="bg-stone-200 px-1 py-0.5 rounded font-mono">/api/chat</code> which validates user identity before communicating with Gemini using server-only environment secrets.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-stone-900">
                Threat 3: Prompt Injection & Behavioral Hijacking
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                Mitigated
              </span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              <strong>Risk:</strong> Malicious user input instructs the AI to ignore its persona, reveal system instructions, or execute arbitrary operations.
              <br />
              <strong>Mitigation:</strong> The backend wraps user inputs in explicit journal boundary tags and sets an immutable System Instruction. User input is treated strictly as reflective journal text, and output is treated as untrusted text rather than executable commands.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Firestore Rules Code */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-stone-700" />
            3. Deployed Firestore Security Rules
          </h3>
          <button
            onClick={copyRules}
            className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy Rules"}</span>
          </button>
        </div>
        <p className="text-xs text-stone-600 mb-3">
          Exact contents of <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">firestore.rules</code> deployed to Firebase:
        </p>

        <pre className="p-4 bg-stone-900 text-stone-100 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-stone-800">
          {firestoreRulesText}
        </pre>
      </div>

      {/* 4. Secrets & Environment Variables */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-stone-700" />
          4. Required Secrets & Environment Variables
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-stone-200 rounded-xl">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-700">
              <tr>
                <th className="p-3 font-semibold">Variable Name</th>
                <th className="p-3 font-semibold">Storage Location</th>
                <th className="p-3 font-semibold">Consumed By</th>
                <th className="p-3 font-semibold">Security Requirement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-600">
              <tr>
                <td className="p-3 font-mono font-bold text-stone-900">GEMINI_API_KEY</td>
                <td className="p-3">GCP Secret Manager</td>
                <td className="p-3">Backend proxy (<code className="font-mono">server.ts</code>)</td>
                <td className="p-3 text-emerald-700 font-medium">NEVER exposed to client/browser</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-stone-900">FIREBASE_PROJECT_ID</td>
                <td className="p-3">Environment / Applet config</td>
                <td className="p-3">Token verification middleware</td>
                <td className="p-3">Matches token audience & issuer</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-stone-900">PORT</td>
                <td className="p-3">Environment</td>
                <td className="p-3">Container ingress (3000)</td>
                <td className="p-3">Required port binding</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Security Simplifications Note */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6">
        <h3 className="text-base font-bold text-amber-950 mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-amber-700" />
          5. What Was Deliberately NOT Done and Why
        </h3>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-amber-900 leading-relaxed">
          <li>
            <strong>Did NOT implement client-side Gemini calls:</strong> Even though client-side SDK calls are easier to set up, doing so leaks the API key in client HTTP requests. All AI calls proxy through <code className="bg-amber-100 px-1 rounded font-mono">/api/chat</code>.
          </li>
          <li>
            <strong>Did NOT use a flat top-level <code className="bg-amber-100 px-1 rounded font-mono">/entries</code> collection:</strong> Filtering top-level collections by <code className="bg-amber-100 px-1 rounded font-mono">where('userId', '==', uid)</code> risks IDOR if client queries are altered. Structuring subcollections under <code className="bg-amber-100 px-1 rounded font-mono">/users/{`{userId}`}/entries</code> creates a physical isolation boundary enforced by security rules.
          </li>
          <li>
            <strong>Did NOT trust client-supplied user IDs:</strong> The server verifies the cryptographic Firebase ID token using Google's public JWKS certificates and derives the authenticated user UID from <code className="bg-amber-100 px-1 rounded font-mono">token.sub</code>.
          </li>
        </ul>
      </div>
    </div>
  );
};
