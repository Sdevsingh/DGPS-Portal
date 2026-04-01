"use client";

import { useState } from "react";

// 1. Define the TypeScript interface for your props
interface UserStatusToggleProps {
  userId: string;
  initialStatus: boolean | string;
}

export default function UserStatusToggle({ userId, initialStatus }: UserStatusToggleProps) {
  // Convert string "true"/"false" from Google Sheets to an actual boolean
  const [isActive, setIsActive] = useState<boolean>(
    initialStatus === "true" || initialStatus === true
  );
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleToggle = async () => {
    if (isUpdating) return; 

    const previousState = isActive;
    const newState = !isActive;

    // OPTIMISTIC UI UPDATE
    setIsActive(newState);
    setIsUpdating(true);

    try {
      // BACKGROUND SERVER UPDATE
      // import { updateUserStatus } from "@/app/actions/users"; 
      // await updateUserStatus(userId, newState ? "true" : "false");
      
      // Simulating network delay
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      
    } catch (error) {
      console.error("Failed to update user status:", error);
      setIsActive(previousState);
      alert("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-medium ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
      
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        onClick={handleToggle}
        disabled={isUpdating}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full 
          border-2 border-transparent transition-colors duration-200 ease-in-out 
          focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isActive ? "bg-emerald-500" : "bg-slate-300"}
        `}
      >
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full 
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${isActive ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}