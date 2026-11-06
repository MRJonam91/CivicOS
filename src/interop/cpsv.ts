// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import type { CivicFormSchema } from '../core/types.ts';

export interface CpsvPublicServiceJsonLd {
  '@context': Record<string, string>;
  '@type': string;
  id: string;
  identifier: string;
  title: {
    it: string;
    en?: string;
  };
  description: {
    it: string;
  };
  hasCompetentAuthority: {
    '@type': string;
    prefLabel: string;
  };
  processingTime: string;
  spatial: string;
  hasInput: Array<{
    '@type': string;
    identifier: string;
    name: string;
    description?: string;
    isRequired: boolean;
    dataType: string;
  }>;
}

export class CpsvApSerializer {
  public static serializeService(schema: CivicFormSchema): CpsvPublicServiceJsonLd {
    return {
      '@context': {
        cpsv: 'http://purl.org/vocab/cpsv#',
        cv: 'http://data.europa.eu/m8g/',
        dct: 'http://purl.org/dc/terms/',
        skos: 'http://www.w3.org/2004/02/skos/core#',
        xsd: 'http://www.w3.org/2001/XMLSchema#'
      },
      '@type': 'cpsv:PublicService',
      id: `urn:civicos:service:${schema.id}`,
      identifier: schema.code,
      title: {
        it: schema.title,
        ...(schema.titleEn ? { en: schema.titleEn } : {})
      },
      description: {
        it: schema.description
      },
      hasCompetentAuthority: {
        '@type': 'cv:PublicOrganisation',
        prefLabel: schema.competentBody
      },
      processingTime: `P${schema.slaDays}D`,
      spatial: 'http://publications.europa.eu/resource/authority/country/ITA',
      hasInput: schema.fields.map(f => ({
        '@type': 'cv:Evidence',
        identifier: f.name,
        name: f.label,
        ...(f.description ? { description: f.description } : {}),
        isRequired: !!f.required,
        dataType: `xsd:${mapTypeToXsd(f.type)}`
      }))
    };
  }

  public static serializeCatalog(schemas: CivicFormSchema[]): string {
    const list = schemas.map(s => this.serializeService(s));
    return JSON.stringify(list, null, 2);
  }
}

function mapTypeToXsd(type: string): string {
  switch (type) {
    case 'number':
      return 'decimal';
    case 'date':
      return 'date';
    case 'checkbox':
      return 'boolean';
    default:
      return 'string';
  }
}
