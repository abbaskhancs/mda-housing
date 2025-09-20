"use client";

import React from "react";
import AuthGuard from "@/components/AuthGuard";
import { IntakeForm } from "@/components/IntakeForm";

export default function NewApplicationPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <IntakeForm />
      </div>
    </AuthGuard>
  );
}


