import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { useAuth } from "../state/auth";
import { api } from "../lib/api";

const schema = z.object({
  name: z.string().min(2)
});

type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? "" }
  });

  async function onSubmit(values: FormValues) {
    await api.put("/me", values);
    toast.success("Profile updated. Refresh to see the latest name.");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <div className="text-sm text-slate-600 dark:text-slate-300">Manage your account</div>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase text-slate-500">Email</div>
            <div className="mt-1">{user?.email ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">User ID</div>
            <div className="mt-1 break-all text-sm">{user?.id ?? "-"}</div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-2 text-sm font-medium">Update name</div>
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Name" {...register("name")} error={errors.name?.message} />
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

