export type Option<T, E> = { some: T; none?: undefined; } | { some?: undefined; none: E; };
