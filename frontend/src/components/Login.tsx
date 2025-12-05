import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { AlertCircle, Eye, EyeOff, User, Lock, Clock } from "lucide-react";

interface LoginProps {
  onSwitchToRegister: () => void;
}

export function Login({ onSwitchToRegister }: LoginProps) {
  const { login, sessionExpired, clearSessionExpired } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Clear session expired message after 5 seconds
  useEffect(() => {
    if (sessionExpired) {
      const timer = setTimeout(() => {
        clearSessionExpired();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sessionExpired, clearSessionExpired]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    clearSessionExpired();

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    const result = await login({ email, password });
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || "Login failed");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      />

      {/* Login Card */}
      <div
        className="relative z-10 p-8 rounded-2xl shadow-2xl max-w-sm sm:max-w-none sm:w-3/5"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
        }}
      >
        {/* Title */}
        <h1 className="text-2xl font-bold text-blue-600 text-center mb-1">IT-Engineering Hub</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {sessionExpired && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border-2 border-amber-500 rounded-lg text-amber-700 text-sm shadow-sm">
              <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-800">Session Expired</p>
                <p className="text-amber-600">Your session has expired. Please sign in again.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-500 rounded-lg text-red-700 text-sm shadow-sm">
              <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-800">Login Failed</p>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-xs text-gray-600 uppercase tracking-wider mb-2 font-medium">
              Email
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e: { target: { value: any; }; }) => setEmail(e.target.value)}
                className="pl-10 bg-white border-0 text-gray-900 placeholder:text-gray-400 rounded-lg w-full"
                style={{ backgroundColor: "white", height: "56px" }}
                disabled={isLoading}
              />
            </div>
          </div>
          <br />
          {/* Password Field */}
          <div>
            <label className="block text-xs text-gray-600 uppercase tracking-wider mb-2 font-medium">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-white border-0 text-gray-900 placeholder:text-gray-400 rounded-lg w-full"
                style={{ backgroundColor: "white", height: "56px" }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <br />

          {/* Login Button */}
          <Button
            type="submit"
            className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full transition-colors mt-2"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "LOGIN"}
          </Button>
        </form>

        {/* Register Link */}
        <div className="mt-5 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <button
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
