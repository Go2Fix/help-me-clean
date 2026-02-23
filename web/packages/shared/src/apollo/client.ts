import {
  ApolloClient,
  ApolloLink,
  FieldPolicy,
  InMemoryCache,
  Reference,
  split,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import createUploadLink from 'apollo-upload-client/createUploadLink.mjs';

// Reusable merge for cursor-based paginated fields using { edges, pageInfo, totalCount }.
// Appends incoming edges when paginating (args.after present), replaces on fresh query.
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

export function createApolloClient(graphqlEndpoint: string, wsEndpoint?: string) {
  const uploadLink = createUploadLink({
    uri: graphqlEndpoint,
    credentials: 'include', // ✅ Send httpOnly cookies with every request (Phase 2 security)
  }) as unknown as ApolloLink;

  // Keep authLink for backward compatibility during migration (users with old localStorage tokens)
  // Backend supports both cookie and Authorization header during transition period
  const authLink = setContext((_, { headers }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      headers: {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  let link = authLink.concat(uploadLink);

  // Phase 4: Auto-detect WebSocket protocol from HTTP endpoint
  // If no wsEndpoint provided, derive it from graphqlEndpoint
  // https:// → wss://, http:// → ws://
  if (!wsEndpoint) {
    try {
      const url = new URL(graphqlEndpoint);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      wsEndpoint = `${wsProtocol}//${url.host}${url.pathname}`;
    } catch (e) {
      console.warn('Failed to auto-detect WebSocket endpoint:', e);
    }
  }

  if (wsEndpoint) {
    const wsLink = new GraphQLWsLink(
      createClient({
        url: wsEndpoint,
        connectionParams: () => {
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
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
      authLink.concat(uploadLink),
    );
  }

  return new ApolloClient({
    link,
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            // Cursor-based paginated queries — proper merge for fetchMore + separate cache per filter
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
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
      },
    },
  });
}
