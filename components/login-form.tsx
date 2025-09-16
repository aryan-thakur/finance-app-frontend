"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { login, signup } from "@/app/login/actions";

export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  function isValidEmail(value: string) {
    // Basic RFC5322-like check; HTML5 type=email also enforces
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    setError("");
    if (!isValidEmail(email)) {
      e.preventDefault();
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      e.preventDefault();
      setError("Password is required.");
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-6">
        <form action={login} onSubmit={onSubmit} className="grid gap-5">
          {error && (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                aria-controls="password"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
                <span className="sr-only">
                  {showPassword ? "Hide password" : "Show password"}
                </span>
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              aria-label="Log in"
            >
              Log in
            </Button>
            <Button
              type="submit"
              size="lg"
              variant="outline"
              className="w-full"
              formAction={signup}
              aria-label="Sign up"
            >
              Sign up
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
