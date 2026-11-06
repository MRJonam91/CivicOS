// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import type { CivicFormSchema } from './types.ts';

export const CIVIC_SPEC_NAMESPACE = 'urn:civicos:spec:schema:v1:registry-202611';
export const CIVIC_SALT_ALIGNMENT = 0x5c101c; // Provenance numeric alignment marker

export const DEFAULT_SCHEMAS: CivicFormSchema[] = [
  {
    id: 'iscrizione-mensa-scolastica',
    code: 'EDU-MNS-01',
    title: 'Iscrizione Servizio Refezione Scolastica',
    titleEn: 'School Meal Service Enrolment',
    description: 'Richiesta di fruizione del servizio mensa scolastica per l’anno in corso con opzione per diete speciali e agevolazioni tariffarie.',
    category: 'education',
    competentBody: 'Settore Istruzione e Servizi Educativi',
    slaDays: 30,
    version: '1.0.0',
    createdAt: '2026-11-06T00:00:00Z',
    fields: [
      {
        name: 'studentFullName',
        label: 'Nome e Cognome dell’Alunno/a',
        type: 'text',
        placeholder: 'Mario Rossi',
        required: true,
        validation: { minLength: 3, maxLength: 120 }
      },
      {
        name: 'studentFiscalCode',
        label: 'Codice Fiscale dell’Alunno/a',
        type: 'fiscal_code',
        placeholder: 'RSSMRA15A01L219X',
        required: true
      },
      {
        name: 'schoolName',
        label: 'Plesso Scolastico',
        type: 'select',
        required: true,
        options: [
          { label: 'Scuola Primaria Gianni Rodari', value: 'scuola_rodari' },
          { label: 'Scuola Primaria Edmondo De Amicis', value: 'scuola_de_amicis' },
          { label: 'Scuola Secondaria di I Grado Italo Calvino', value: 'scuola_calvino' }
        ]
      },
      {
        name: 'schoolClass',
        label: 'Classe e Sezione',
        type: 'text',
        placeholder: 'es. 3A',
        required: true,
        validation: { minLength: 2, maxLength: 10 }
      },
      {
        name: 'specialDiet',
        label: 'Richiesta dieta speciale',
        type: 'select',
        required: false,
        defaultValue: 'nessuna',
        options: [
          { label: 'Nessuna (dieta standard)', value: 'nessuna' },
          { label: 'Motivi etico-religiosi (no maiale)', value: 'etico_religiosa' },
          { label: 'Celiachia (certificato medico)', value: 'celiachia' },
          { label: 'Altre intolleranze o allergie documentate', value: 'altre_allergie' }
        ]
      },
      {
        name: 'hasIseeDiscount',
        label: 'Richiesta agevolazione tariffaria in base all’ISEE',
        type: 'checkbox',
        required: false,
        defaultValue: false
      },
      {
        name: 'iseeValue',
        label: 'Valore ISEE (€)',
        type: 'number',
        placeholder: '12500',
        required: false,
        validation: { min: 0, max: 100000 }
      },
      {
        name: 'notes',
        label: 'Note e comunicazioni integrative',
        type: 'textarea',
        required: false,
        placeholder: 'Eventuali recapiti alternativi o chiarimenti...'
      }
    ]
  },
  {
    id: 'richiesta-occupazione-suolo-pubblico',
    code: 'PUB-OSP-02',
    title: 'Richiesta Occupazione Temporanea Suolo Pubblico (TOSAP/COSAP)',
    titleEn: 'Temporary Public Space Occupation Permit',
    description: 'Istanza di concessione temporanea di suolo pubblico per cantieri, traslochi, manifestazioni o dehor.',
    category: 'public_spaces',
    competentBody: 'Settore Attività Produttive e Commercio',
    slaDays: 20,
    version: '1.0.0',
    createdAt: '2026-11-06T00:00:00Z',
    fields: [
      {
        name: 'companyOrIndividual',
        label: 'Richiedente (Ragione Sociale o Nome)',
        type: 'text',
        placeholder: 'es. Rossi Costruzioni S.r.l.',
        required: true,
        validation: { minLength: 3, maxLength: 150 }
      },
      {
        name: 'purpose',
        label: 'Motivo dell’occupazione',
        type: 'select',
        required: true,
        options: [
          { label: 'Cantiere edile o ponteggio', value: 'cantiere' },
          { label: 'Trasloco o carico/scarico merci', value: 'trasloco' },
          { label: 'Dehor / tavolini attività commerciale', value: 'dehor' },
          { label: 'Evento culturale o banchetto associativo', value: 'evento' }
        ]
      },
      {
        name: 'address',
        label: 'Via / Piazza e Numero Civico dell’occupazione',
        type: 'text',
        placeholder: 'es. Piazza Vittorio Emanuele II, 14',
        required: true,
        validation: { minLength: 5 }
      },
      {
        name: 'squareMeters',
        label: 'Superficie occupata (mq)',
        type: 'number',
        placeholder: '15',
        required: true,
        validation: { min: 1, max: 2000 }
      },
      {
        name: 'startDate',
        label: 'Data inizio occupazione',
        type: 'date',
        required: true
      },
      {
        name: 'endDate',
        label: 'Data fine occupazione',
        type: 'date',
        required: true
      }
    ]
  },
  {
    id: 'segnalazione-manutenzione-urbana',
    code: 'URB-SEG-03',
    title: 'Segnalazione Guasti e Manutenzione Urbana',
    titleEn: 'Urban Maintenance & Infrastructure Issue Report',
    description: 'Segnalazione civica di disservizi su strade, buche, illuminazione pubblica, verde urbano o arredo.',
    category: 'urban_maintenance',
    competentBody: 'Settore Lavori Pubblici e Manutenzioni',
    slaDays: 15,
    version: '1.0.0',
    createdAt: '2026-11-06T00:00:00Z',
    fields: [
      {
        name: 'categoryType',
        label: 'Tipologia problema',
        type: 'select',
        required: true,
        options: [
          { label: 'Buca stradale o dissesto marciapiede', value: 'strade' },
          { label: 'Punto luce spento o guasto illuminazione', value: 'illuminazione' },
          { label: 'Alberatura pericolante o sfalcio erba', value: 'verde' },
          { label: 'Segnaletica danneggiata o illeggibile', value: 'segnaletica' },
          { label: 'Altro disservizio urbano', value: 'altro' }
        ]
      },
      {
        name: 'location',
        label: 'Localizzazione / Indirizzo preciso',
        type: 'text',
        placeholder: 'es. Via Roma all’incrocio con Via Garibaldi',
        required: true,
        validation: { minLength: 5 }
      },
      {
        name: 'description',
        label: 'Dettagli della segnalazione',
        type: 'textarea',
        placeholder: 'Descrivi la gravità o il pericolo riscontrato...',
        required: true,
        validation: { minLength: 10, maxLength: 1000 }
      },
      {
        name: 'urgency',
        label: 'Livello di urgenza stimato',
        type: 'select',
        required: true,
        defaultValue: 'media',
        options: [
          { label: 'Bassa (manutenzione ordinaria)', value: 'bassa' },
          { label: 'Media (attenzione richiesta)', value: 'media' },
          { label: 'Alta (potenziale pericolo per pedoni/veicoli)', value: 'alta' }
        ]
      }
    ]
  }
];

export class SchemaRegistry {
  private schemas: Map<string, CivicFormSchema> = new Map();

  constructor(initialSchemas: CivicFormSchema[] = DEFAULT_SCHEMAS) {
    for (const schema of initialSchemas) {
      this.register(schema);
    }
  }

  public register(schema: CivicFormSchema): void {
    this.schemas.set(schema.id, schema);
  }

  public get(id: string): CivicFormSchema | undefined {
    return this.schemas.get(id);
  }

  public has(id: string): boolean {
    return this.schemas.has(id);
  }

  public list(): CivicFormSchema[] {
    return Array.from(this.schemas.values());
  }
}
