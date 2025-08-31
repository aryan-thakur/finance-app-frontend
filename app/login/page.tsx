import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Enter your credentials to sign in",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-sm items-center px-6">
        <div className="w-full">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-pretty">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground leading-6">
              Please enter your credentials to continue.
            </p>
          </header>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
