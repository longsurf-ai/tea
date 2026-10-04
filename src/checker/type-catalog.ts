// Purpose: Checker-owned catalog of implemented source-facing Tea type forms; compiler-only representations are explicitly excluded.

import {
  BoolType,
  BoxType,
  ColorType,
  FloatType,
  IntType,
  LabelType,
  LinefillType,
  LineType,
  PolylineType,
  StringType,
  TableType,
  TypeKind,
  VoidType,
  type Type,
} from '../ir/type';

interface PublicTypeBase {
  readonly name: string;
  readonly typeKind: TypeKind;
}

export interface AnnotationTypeDescriptor extends PublicTypeBase {
  readonly kind: 'annotation';
  readonly type: Type;
}

export type CollectionTypeName = 'array' | 'matrix' | 'map';
export type CollectionTypeConstraint = 'storable' | 'map-key';

export interface CollectionTypeDescriptor extends PublicTypeBase {
  readonly kind: 'collection';
  readonly name: CollectionTypeName;
  readonly typeParams: readonly {
    readonly name: string;
    readonly constraint: CollectionTypeConstraint;
  }[];
}

export interface DeclarationTypeDescriptor extends PublicTypeBase {
  readonly kind: 'declaration';
}

export interface ReferenceOnlyTypeDescriptor extends PublicTypeBase {
  readonly kind: 'reference-only';
  readonly methodResultType?: Type;
}

export type PublicTypeDescriptor =
  | AnnotationTypeDescriptor
  | CollectionTypeDescriptor
  | DeclarationTypeDescriptor
  | ReferenceOnlyTypeDescriptor;

// @agent invariant: This catalog is the complete public projection of Tea's
// implemented type domain. Adding a source-facing TypeKind requires a
// descriptor; compiler poison and non-source function signatures stay in the
// explicit omission list below.
export const PUBLIC_TYPE_CATALOG: readonly PublicTypeDescriptor[] = [
  {
    kind: 'annotation',
    name: 'int',
    typeKind: TypeKind.Int,
    type: IntType,
  },
  {
    kind: 'annotation',
    name: 'float',
    typeKind: TypeKind.Float,
    type: FloatType,
  },
  {
    kind: 'annotation',
    name: 'bool',
    typeKind: TypeKind.Bool,
    type: BoolType,
  },
  {
    kind: 'annotation',
    name: 'string',
    typeKind: TypeKind.String,
    type: StringType,
  },
  {
    kind: 'annotation',
    name: 'color',
    typeKind: TypeKind.Color,
    type: ColorType,
  },
  {
    kind: 'annotation',
    name: 'line',
    typeKind: TypeKind.Line,
    type: LineType,
  },
  {
    kind: 'annotation',
    name: 'label',
    typeKind: TypeKind.Label,
    type: LabelType,
  },
  {
    kind: 'annotation',
    name: 'box',
    typeKind: TypeKind.Box,
    type: BoxType,
  },
  {
    kind: 'annotation',
    name: 'table',
    typeKind: TypeKind.Table,
    type: TableType,
  },
  {
    kind: 'annotation',
    name: 'polyline',
    typeKind: TypeKind.Polyline,
    type: PolylineType,
  },
  {
    kind: 'annotation',
    name: 'linefill',
    typeKind: TypeKind.Linefill,
    type: LinefillType,
  },
  {
    kind: 'collection',
    name: 'array',
    typeKind: TypeKind.Array,
    typeParams: [{name: 'T', constraint: 'storable'}],
  },
  {
    kind: 'collection',
    name: 'matrix',
    typeKind: TypeKind.Matrix,
    typeParams: [{name: 'T', constraint: 'storable'}],
  },
  {
    kind: 'collection',
    name: 'map',
    typeKind: TypeKind.Map,
    typeParams: [
      {name: 'K', constraint: 'map-key'},
      {name: 'V', constraint: 'storable'},
    ],
  },
  {
    kind: 'declaration',
    name: 'enum',
    typeKind: TypeKind.Enum,
  },
  {
    kind: 'declaration',
    name: 'struct',
    typeKind: TypeKind.Struct,
  },
  {
    kind: 'reference-only',
    name: 'na',
    typeKind: TypeKind.Na,
  },
  {
    kind: 'reference-only',
    name: 'tuple',
    typeKind: TypeKind.Tuple,
  },
  {
    kind: 'reference-only',
    name: 'void',
    typeKind: TypeKind.Void,
    methodResultType: VoidType,
  },
];

export const INTERNAL_TYPE_KINDS: readonly TypeKind[] = [
  TypeKind.Invalid,
  TypeKind.Func,
];

const annotationTypes = new Map<string, Type>();
const collectionTypes = new Map<CollectionTypeName, CollectionTypeDescriptor>();
const methodResultTypes = new Map<string, Type>();

for (const descriptor of PUBLIC_TYPE_CATALOG) {
  if (descriptor.kind === 'annotation') {
    annotationTypes.set(descriptor.name, descriptor.type);
  } else if (descriptor.kind === 'collection') {
    collectionTypes.set(descriptor.name, descriptor);
  } else if (
    descriptor.kind === 'reference-only' &&
    descriptor.methodResultType !== undefined
  ) {
    methodResultTypes.set(descriptor.name, descriptor.methodResultType);
  }
}

export const BUILTIN_ANNOTATION_TYPES: ReadonlyMap<string, Type> =
  annotationTypes;
export const COLLECTION_TYPE_CATALOG: ReadonlyMap<
  string,
  CollectionTypeDescriptor
> = collectionTypes;
export const METHOD_RESULT_TYPES: ReadonlyMap<string, Type> = methodResultTypes;
