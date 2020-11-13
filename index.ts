import * as fp from 'fastify-plugin';
import axios, { AxiosInstance } from 'axios';
import { URLSearchParams } from 'url';
import { FastifyInstance } from 'fastify';
import * as http from 'http';

declare module 'fastify' {
  export interface FastifyInstance<
    HttpServer = http.Server,
    HttpRequest = http.IncomingMessage,
    HttpResponse = http.ServerResponse
    > {
    tado: any;
  }
}

interface FastifyTadoOptions {
  email: string;
  password: string;
}

let axiosInstance: AxiosInstance;

let opts: FastifyTadoOptions;

const tado = {
  isAuthenticated: async () => {
    try {
      await axiosInstance.get('/')
      return true
    } catch (error) {
      return await tado.auth(error)
    }
  },
  
  auth: async (err: any) => {
    if (err.response.status === 401) {
      try {
        const res = await tado.getToken(opts.email, opts.password)
        axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + res.data.access_token
        return true
      } catch (error) {
        return false
      }
    }
  },

  getToken: async (email: string, password: string) => {
    const params = new URLSearchParams()
    params.append('client_id', 'tado-web-app')
    params.append('grant_type', 'password')
    params.append('scope', 'home.user')
    params.append('username', email)
    params.append('password', password)
    params.append('client_secret', 'wZaRN7rpjn3FoNyF5IFuxg9uMzYJcvOoQ8QWiIqS3hfk6gLhVlG57j5YNoZL2Rtc');
    return axios.post('https://auth.tado.com/oauth/token', params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  },

  getRoomSensorData: async (roomId: number) => {
    let res = await axiosInstance.get(`/zones/${roomId}/state`)
    return res.data.sensorDataPoints;
  },

  setRadiatorTemperature: async (roomId: number, newTemperature: number) => {
    const isAuth = await tado.isAuthenticated();
    if (isAuth) {
      const resState = await axiosInstance.get(`/zones/${roomId}/state`);
      resState.data.setting.temperature.celsius = newTemperature;
      resState.data.setting.temperature.fahrenheit = newTemperature * 9 / 5 + 32;
      const data = {
        setting: resState.data.setting,
        termination: {
          type: 'TADO_MODE'
        }
      }
      let resUpdate = await axiosInstance.put(`/zones/${roomId}/overlay`, data);
      return (resUpdate.status === 200 ? true : false);
    }
  }
};

async function decorateFastifyInstance(fastify: FastifyInstance, client: AxiosInstance, next) {
  fastify.decorate('tado', tado);
}

async function fastifyTado(fastify: FastifyInstance, options: FastifyTadoOptions, next) {
  if (!options.email || !options.password) {
    next(new Error)('`email and password` parameter are mandotory');
    return;
  }

  opts.email = options.email;
  opts.password = options.password;
  
  axiosInstance = axios.create({
    baseURL: 'https://my.tado.com/api/v2/homes/384414',
    validateStatus: function (status) { return status >= 200 && status < 300 }
  });
  decorateFastifyInstance(fastify, axiosInstance, next);
}

export default fp(fastifyTado, {
  fastify: '>=1.0.0',
  name: 'fastify-tado'
});
