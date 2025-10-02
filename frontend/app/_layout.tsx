import { Stack } from "expo-router";

import { AuthProvider } from "../../context/AuthContext";
import { HabitDataProvider } from "../../context/HabitDataContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <HabitDataProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </HabitDataProvider>
    </AuthProvider>
  );
}
