import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { AlertCircle, Eye, EyeOff, User, Lock } from "lucide-react";

interface LoginProps {
  onSwitchToRegister: () => void;
}

export function Login({ onSwitchToRegister }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
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
