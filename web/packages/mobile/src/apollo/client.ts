import {
  ApolloClient,
  ApolloLink,
  FieldPolicy,
  HttpLink,
  InMemoryCache,
  Reference,
  split,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import * as SecureStore from 'expo-secure-store';
import { createClient } from 'graphql-ws';

// NOTE: apollo-upload-client uses ESM and is not compatible with Metro bundler in React Native.
// File uploads on mobile use multipart form via a custom fetch per feature.

const TOKEN_KEY = 'go2fix_token';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

function cursorPaginatedField(keyArgs: string[] | false): FieldPolicy {
  return {
    keyArgs,
    merge(existing, incoming, { args }) {
      if (!existing || !args?.after) return incoming;
      return {
        ...incoming,
        edges: [...(existing.edges ?? []), ...(incoming.edges ?? [])],
      };
    },
  };
}

export function createMobileApolloClient(
  graphqlEndpoint: string,
  wsEndpoint?: string,
  existingCache?: InMemoryCache,
): ApolloClient<unknown> {
  const httpLink = new HttpLink({
    uri: graphqlEndpoint,
    credentials: 'include',
  });

  const authLink = setContext(async (_, { headers }: { headers?: Record<string, string> }) => {
    const token = await getToken();
    return {
      headers: {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  let link: ApolloLink = authLink.concat(httpLink);

  // Derive WebSocket endpoint from HTTP endpoint if not explicitly provided
  let resolvedWsEndpoint = wsEndpoint;
  if (!resolvedWsEndpoint) {
    try {
      const url = new URL(graphqlEndpoint);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      resolvedWsEndpoint = `${wsProtocol}//${url.host}${url.pathname}`;
    } catch (e) {
      console.warn('Failed to auto-detect WebSocket endpoint:', e);
    }
  }

  if (resolvedWsEndpoint) {
    const wsLink = new GraphQLWsLink(
      createClient({
        url: resolvedWsEndpoint,
        connectionParams: async () => {
          const token = await getToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    );

    link = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      authLink.concat(httpLink),
    );
  }

  const cache = existingCache ?? buildMobileCache();

  return new ApolloClient({
    link,
    cache,
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network' },
    },
  });
}

/**
 * Constructs the shared InMemoryCache with all type policies applied.
 * Exported separately so the root layout can pass it to `initApolloCache`
 * for offline persistence without blocking the synchronous client creation.
 */
export function buildMobileCache(): InMemoryCache {
  return new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          myBookings: cursorPaginatedField(['status']),
          myInvoices: cursorPaginatedField(false),
          myPaymentHistory: cursorPaginatedField(false),
          companyBookings: cursorPaginatedField(['status']),
          companyInvoices: cursorPaginatedField(['status']),
          allBookings: cursorPaginatedField(['status', 'companyId']),
          allInvoices: cursorPaginatedField(['type', 'status', 'companyId']),
          searchCompanies: cursorPaginatedField(['query', 'status']),
        },
      },
      ChatRoom: {
        fields: {
          messages: {
            // Deduplicate messages by __ref (normalized) or id (inline) to prevent
            // race conditions between sendMessage mutation update and subscription onData.
            merge(existing, incoming) {
              if (!existing) return incoming;
              const existingRefs = new Set(
                (existing.edges ?? []).map(
                  (e: Reference | { id: string }) => ('__ref' in e ? e.__ref : e.id),
                ),
              );
              const newEdges = (incoming.edges ?? []).filter(
                (e: Reference | { id: string }) =>
                  !existingRefs.has('__ref' in e ? e.__ref : e.id),
              );
              return {
                ...incoming,
                edges: [...existing.edges, ...newEdges],
              };
            },
          },
        },
      },
    },
  });
}
