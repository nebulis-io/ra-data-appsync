import buildGraphQLProvider from 'ra-data-graphql';
import buildQuery from './buildQuery';
import { createHttpLink } from 'apollo-link-http';
import { ApolloLink, concat } from 'apollo-link';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient,  } from 'apollo-client';

const buildAppSyncProvider = (args) => {
    const httpLink = createHttpLink({
        uri: args.endpoint
    });

    const authMiddleware = new ApolloLink((operation, forward) => {
        operation.setContext({
            headers: {
                "x-api-key": args.auth.apiKey,
            }
        });
        return forward(operation);
    })
    
    const client = new ApolloClient({
        link: concat(authMiddleware, httpLink),
        cache: new InMemoryCache()
    });
      
    return buildGraphQLProvider({
      client,
      buildQuery
    })

};

export default buildAppSyncProvider;