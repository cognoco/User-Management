import { Outlet } from "react-router-dom";
import { UserLayout as HeadlessUserLayout } from "../../headless/layout/UserLayout";

export function UserLayout(): React.ReactElement {
  return (
    <HeadlessUserLayout>
      {({ SessionPolicyEnforcer }) => (
        <SessionPolicyEnforcer>
          <Outlet />
        </SessionPolicyEnforcer>
      )}
    </HeadlessUserLayout>
  );
}
