# CONTRATOS Y TIPOS: ARRANQUE Y MOTOR

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 01_arranque_y_motor

## 1. FIRMAS DEL NUCLEO

```typescript
const VERSION_ESQUEMA_MOTOR = 1 as const;

type TipoActor =
  | 'negocio' | 'publico' | 'central' | 'repartidor' | 'sistema' | 'automatizacion';

type Actor = { tipo: TipoActor; id: string };

type IdentidadNegocio = {
  rutaNegocio: string; negocioId: string; categoriaId: string;
};

type OrigenSenal =
  | 'negocio' | 'publico' | 'llamada' | 'mensajeria'
  | 'redes' | 'sistema' | 'automatizacion' | 'servicio_domicilio';
```

## 2. COMPOSICION DE PANTALLAS

```typescript
type ScreenRegistroEntrada = {
  Screen: React.ComponentType<any>;
  useLogic?: (...args: any[]) => any;
  staticProps?: Record<string, any>;
};

type ScreenResuelto = {
  Screen: React.ComponentType<any> | null;
  props: Record<string, any>;
  loading: boolean;
  error: string | null;
  niche: string | null;
  category: string | null;
};
```

## 3. INVARIANTES DE ARRANQUE

- `useBootstrapper()` retorna `isReady: boolean`; sin `true`, ninguna ruta protegida se renderiza.
- `PUBLIC_ROUTES = ['/']`; todo lo demas exige sesion via `useAuthGuard`.
- El motor no conoce Firebase ni React: opera con contratos puros.

## 4. FLUJO DE INICIALIZACION

app/index.tsx -> /access -> useBootstrapper -> useAuthGuard -> RootLayout (proveedores) -> REGISTRO_PANTALLAS -> rol
