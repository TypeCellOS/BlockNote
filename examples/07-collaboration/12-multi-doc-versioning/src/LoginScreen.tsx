import { setCurrentUser } from "./identity.js";
import { navigate } from "./router.js";
import { USERS } from "./userdata.js";

export function LoginScreen({ redirectTo }: { redirectTo: string }) {
  const handlePick = (id: string) => {
    setCurrentUser(id);
    navigate(redirectTo || "/");
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1 className="login-title">Welcome</h1>
        <p className="login-subtitle">
          Pick a user to continue. This is a demo — there are no passwords.
        </p>
        <div className="login-users">
          {USERS.map((u) => (
            <button
              key={u.id}
              className="login-user"
              onClick={() => handlePick(u.id)}
              style={{ "--user-color": u.color } as React.CSSProperties}
            >
              <span
                className="login-avatar"
                style={{ backgroundColor: u.color }}
              >
                {u.name[0]}
              </span>
              <span className="login-user-name">{u.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
