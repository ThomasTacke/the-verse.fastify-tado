import * as http from 'http';
import { Plugin } from 'fastify';

declare namespace fastifyTado {
  interface FastifyTadoOptions {
    username: string;
    password: string;
  }
}



declare module 'fastify' {
  export interface FastifyInstance<
    HttpServer = http.Server,
    HttpRequest = http.IncomingMessage,
    HttpResponse = http.ServerResponse
    > {
    tado: any;
  }
}

declare let fastifyTado: Plugin<
  http.Server,
  http.IncomingMessage,
  http.ServerResponse,
  fastifyTado.FastifyTadoOptions
>;

export = fastifyTado;