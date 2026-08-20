import { z } from 'zod';
import { resolverConfiguracionTenant } from '../resolverConfiguracionTenant';

const defaultConfig = {
  ticket: {
    header: 'Mi Negocio',
    footer: 'Gracias',
    includeQr: true,
    metadata: null as string | null,
  },
  features: {
    repart: false,
    mesas: true,
  },
  categories: ['base'],
  bloques: [] as Record<string, unknown>[],
};

const schemaConfig = z.object({
  ticket: z.object({
    header: z.string().min(1),
    footer: z.string(),
    includeQr: z.boolean(),
    metadata: z.string().nullable(),
  }),
  features: z.object({
    repart: z.boolean(),
    mesas: z.boolean(),
  }),
  categories: z.array(z.string()),
  bloques: z.array(z.record(z.string(), z.unknown())),
});

describe('resolverConfiguracionTenant', () => {
  test('fusiona solo objetos planos y claves conocidas e ignora undefined', () => {
    const rawConfig = {
      ticket: {
        header: 'Panadería Aurora',
        footer: undefined,
        includeQr: false,
        desconocida: 'no debe sobrevivir',
      },
      features: {
        repart: true,
        extra: true,
      },
      propiedadRemota: 'descartar',
    };

    expect(resolverConfiguracionTenant(rawConfig, defaultConfig)).toEqual({
      ticket: {
        header: 'Panadería Aurora',
        footer: 'Gracias',
        includeQr: false,
        metadata: null,
      },
      features: {
        repart: true,
        mesas: true,
      },
      categories: ['base'],
      bloques: [],
    });

    const instanciaConPrototipo = Object.assign(Object.create({ heredada: true }), {
      ticket: { header: 'No confiable' },
    });
    expect(resolverConfiguracionTenant(instanciaConPrototipo, defaultConfig)).toEqual(defaultConfig);
    expect(resolverConfiguracionTenant(null, defaultConfig)).toEqual(defaultConfig);
    expect(resolverConfiguracionTenant(['config'], defaultConfig)).toEqual(defaultConfig);
  });

  test('acepta null solo cuando la configuración base permite null e ignora tipos incorrectos', () => {
    const result = resolverConfiguracionTenant(
      {
        ticket: {
          header: null,
          footer: 10,
          includeQr: 'sí',
          metadata: null,
        },
        features: false,
        categories: 'panadería',
      },
      defaultConfig
    );

    expect(result).toEqual(defaultConfig);

    const conMetadata = resolverConfiguracionTenant(
      {
        ticket: {
          metadata: 'configuración válida',
        },
      },
      defaultConfig
    );
    expect(conMetadata.ticket.metadata).toBeNull();
  });

  test('reemplaza arreglos completos cuando el default permite inferir un contrato homogéneo', () => {
    const rawConfig = {
      categories: ['pan dulce'],
    };

    const result = resolverConfiguracionTenant(rawConfig, defaultConfig);

    expect(result.categories).toEqual(['pan dulce']);
    expect(result.categories).not.toBe(rawConfig.categories);
    expect(result.categories).not.toContain('base');
  });

  test('rechaza atómicamente arreglos incompatibles o sin contrato inferible cuando no hay schema', () => {
    const result = resolverConfiguracionTenant(
      {
        categories: ['pan dulce', 7],
        bloques: [{ id: 'compacto' }],
      },
      defaultConfig
    );

    expect(result.categories).toEqual(['base']);
    expect(result.bloques).toEqual([]);
  });

  test('deja que el schema valide arreglos sin contrato inferible y valores no-null sobre null', () => {
    const rawConfig = {
      ticket: {
        metadata: 'configuración validada',
      },
      bloques: [
        {
          id: 'compacto',
          nested: ['a', 'b'],
        },
      ],
    };

    const result = resolverConfiguracionTenant(rawConfig, defaultConfig, schemaConfig);

    expect(result.ticket.metadata).toBe('configuración validada');
    expect(result.bloques).toEqual(rawConfig.bloques);
    expect(result.bloques).not.toBe(rawConfig.bloques);
    expect(result.bloques[0]).not.toBe(rawConfig.bloques[0]);
  });

  test('descarta el arreglo completo cuando un elemento no cumple el schema', () => {
    const result = resolverConfiguracionTenant(
      {
        categories: ['pan dulce', 7],
      },
      defaultConfig,
      schemaConfig
    );

    expect(result).toEqual(defaultConfig);
  });

  test('bloquea contaminación de prototipos en toda profundidad, incluso dentro de arreglos', () => {
    const rawConfig = JSON.parse(`{
      "__proto__": {"contaminado": true},
      "prototype": {"contaminado": true},
      "constructor": {"prototype": {"contaminado": true}},
      "ticket": {
        "header": "Seguro",
        "__proto__": {"contaminado": true},
        "constructor": {"prototype": {"contaminado": true}}
      },
      "bloques": [
        {
          "id": "compacto",
          "__proto__": {"contaminado": true},
          "prototype": {"contaminado": true},
          "constructor": {"prototype": {"contaminado": true}}
        }
      ]
    }`);

    const result = resolverConfiguracionTenant(rawConfig, defaultConfig, schemaConfig);
    const bloque = result.bloques[0];

    expect(result.ticket.header).toBe('Seguro');
    expect(Object.prototype).not.toHaveProperty('contaminado');
    expect(Object.hasOwn(result, '__proto__')).toBe(false);
    expect(Object.hasOwn(result.ticket, '__proto__')).toBe(false);
    expect(Object.hasOwn(bloque, '__proto__')).toBe(false);
    expect(Object.hasOwn(bloque, 'prototype')).toBe(false);
    expect(Object.hasOwn(bloque, 'constructor')).toBe(false);
  });

  test('no muta entradas y devuelve objetos y arreglos nuevos a toda profundidad', () => {
    const base = {
      nested: {
        branch: {
          enabled: false,
        },
        items: [{ id: 'base', tags: ['default'] }],
      },
    };
    const raw = {
      nested: {
        branch: {
          enabled: true,
        },
        items: [{ id: 'remote', tags: ['nuevo'] }],
      },
    };
    const baseSnapshot = JSON.parse(JSON.stringify(base));
    const rawSnapshot = JSON.parse(JSON.stringify(raw));

    const result = resolverConfiguracionTenant(raw, base);

    expect(result).not.toBe(base);
    expect(result).not.toBe(raw);
    expect(result.nested).not.toBe(base.nested);
    expect(result.nested).not.toBe(raw.nested);
    expect(result.nested.branch).not.toBe(base.nested.branch);
    expect(result.nested.branch).not.toBe(raw.nested.branch);
    expect(result.nested.items).not.toBe(base.nested.items);
    expect(result.nested.items).not.toBe(raw.nested.items);
    expect(result.nested.items[0]).not.toBe(raw.nested.items[0]);
    expect(result.nested.items[0].tags).not.toBe(raw.nested.items[0].tags);

    result.nested.branch.enabled = false;
    result.nested.items[0].tags.push('mutación local');
    expect(base).toEqual(baseSnapshot);
    expect(raw).toEqual(rawSnapshot);
  });

  test('usa safeParse y vuelve a un clon fresco del default cuando el schema rechaza el resultado', () => {
    const result = resolverConfiguracionTenant(
      {
        ticket: {
          header: '',
        },
      },
      defaultConfig,
      schemaConfig
    );

    expect(result).toEqual(defaultConfig);
    expect(result).not.toBe(defaultConfig);
    expect(result.ticket).not.toBe(defaultConfig.ticket);
    expect(result.categories).not.toBe(defaultConfig.categories);
  });

  test('devuelve un clon fresco del resultado transformado por un schema válido', () => {
    const schema = z
      .object({
        ticket: z.object({
          header: z.string(),
          footer: z.string(),
          includeQr: z.boolean(),
          metadata: z.string().nullable(),
        }),
        features: z.object({
          repart: z.boolean(),
          mesas: z.boolean(),
        }),
        categories: z.array(z.string()),
        bloques: z.array(z.record(z.string(), z.unknown())),
      })
      .transform((config) => ({
        ...config,
        ticket: {
          ...config.ticket,
          header: config.ticket.header.trim(),
        },
      }));

    const result = resolverConfiguracionTenant(
      {
        ticket: {
          header: '  Panadería Aurora  ',
        },
      },
      defaultConfig,
      schema
    );

    expect(result.ticket.header).toBe('Panadería Aurora');
    expect(result).not.toBe(defaultConfig);
    expect(result.ticket).not.toBe(defaultConfig.ticket);
    expect(result.categories).not.toBe(defaultConfig.categories);
  });
});
