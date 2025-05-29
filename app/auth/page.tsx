"use client"

import { useState } from "react"
import { SignInForm } from "@/components/auth/signin-form"
import { SignUpForm } from "@/components/auth/signup-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("signin")

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-r from-blue-50 to-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome to AI Chatbot</h1>
          <p className="mt-2 text-gray-600">
            {activeTab === "signin" 
              ? "Sign in to continue to your account" 
              : "Create an account to get started"}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="mt-6">
            <SignInForm />
          </TabsContent>
          
          <TabsContent value="signup" className="mt-6">
            <SignUpForm />
          </TabsContent>
        </Tabs>

        <div className="text-center text-sm text-gray-600">
          {activeTab === "signin" ? (
            <p>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => setActiveTab("signup")}
                className="text-blue-600 hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                onClick={() => setActiveTab("signin")}
                className="text-blue-600 hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  )
} 