import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { api } from "../lib/api";
import { useAuth } from "../state/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      const res = await api.post<{ token: string }>("/auth/login", values);
      await login(res.data.token);
      toast.success("Welcome back");
      navigate("/");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Login failed";
      toast.error(msg);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center p-4">
      <Card className="w-full">
        <h1 className="text-xl font-semibold">Login</h1>
        <form
          className="mt-4 space-y-3"
          onSubmit={handleSubmit(onSubmit, (e) => {
            toast.error(Object.values(e)[0]?.message ?? "Fix the form errors");
          })}
        >
          <Input label="Email" type="email" {...register("email")} error={errors.email?.message} />
          <Input
            label="Password"
            type="password"
            {...register("password")}
            error={errors.password?.message}
          />
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            No account?{" "}
            <Link className="text-indigo-600 hover:underline dark:text-indigo-400" to="/register">
              Register
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

