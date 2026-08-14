import { Redirect } from 'expo-router';

export default function Index() {
  // Redirigir al inicio de sesión (Flujo Normal)
  return <Redirect href="/access" />;
}
