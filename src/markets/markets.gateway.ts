import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000', // Adjust this to your frontend URL in production
  },
})
export class MarketsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('MarketsGateway');

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  // Broadcasts price updates to all connected clients
  emitPriceUpdate(payload: any) {
    this.server.emit('priceUpdate', payload);
  }
}