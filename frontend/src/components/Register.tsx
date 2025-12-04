import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertCircle, Eye, EyeOff, User, Lock, Mail, Building2, CheckCircle } from "lucide-react";

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export function Register({ onSwitchToLogin }: RegisterProps) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    department: "IT",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    { label: "At least 6 characters", met: formData.password.length >= 6 },
  ];

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    const result = await register({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      department: formData.department,
    });
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || "Registration failed");
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

      {/* Register Card */}
      <div
        className="relative z-10 p-8 rounded-2xl shadow-2xl max-w-sm sm:max-w-none sm:w-3/5"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
        }}
      >
        {/* Title */}
        <h1 className="text-2xl font-bold text-blue-600 text-center mb-1">
          Create Account
        </h1>
        <p className="text-sm text-gray-500 text-center mb-5">Join IT-Engineering Hub</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 uppercase tracking-wide font-medium">
                First Name
              </label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  className="pl-10 bg-white border-0 text-gray-900 placeholder:text-gray-400"
                  style={{ backgroundColor: "white", height: "56px" }}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600 uppercase tracking-wide font-medium">
                Last Name
              </label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  className="pl-10 bg-white border-0 text-gray-900 placeholder:text-gray-400"
                  style={{ backgroundColor: "white", height: "56px" }}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="text-xs text-gray-600 uppercase tracking-wide font-medium">
              Email
            </label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="john.doe@company.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="pl-10 bg-white border-0 text-gray-900 placeholder:text-gray-400"
                style={{ backgroundColor: "white", height: "56px" }}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Department Field */}
          <div>
            <label className="text-xs text-gray-600 uppercase tracking-wide font-medium">
              Department
            </label>
            <div className="relative mt-1">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <Select
                value={formData.department}
                onValueChange={(value) => handleChange("department", value)}
                disabled={isLoading}
              >
                <SelectTrigger className="pl-10 bg-white border-0 text-gray-900" style={{ height: "56px" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="text-xs text-gray-600 uppercase tracking-wide font-medium">
              Password
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="pl-10 pr-10 bg-white border-0 text-gray-900 placeholder:text-gray-400"
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
            {/* Password requirements */}
            <div className="mt-2">
              {passwordRequirements.map((req, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 text-xs ${req.met ? "text-green-600" : "text-gray-500"}`}
                >
                  <CheckCircle className={`w-3 h-3 ${req.met ? "" : "opacity-40"}`} />
                  <span>{req.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="text-xs text-gray-600 uppercase tracking-wide font-medium">
              Confirm Password
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                className="pl-10 pr-10 bg-white border-0 text-gray-900 placeholder:text-gray-400"
                style={{ backgroundColor: "white", height: "56px" }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
            )}
          </div>

          {/* Register Button */}
          <Button
            type="submit"
            className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full transition-colors mt-2"
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : "REGISTER"}
          </Button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
