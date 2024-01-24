import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { version } from '../../package.json';

const options = {
    definition: {
        openapi: '3.1.0',
        info: {
            title: 'PDF Parser API Docs',
            version,
            description: 'PDF Parser api documentation',
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT}/api/v1`,
            },
        ],
    },
    apis: ['./routes/*.ts'],
};

const swaggerSpec = swaggerJsDoc(options);

function swaggerDocs(app, port) {
    // Swagger page
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Docs in JSON format
    app.get('docs.json', (req, res, next) => {
        res.setHeader('Content-Type', 'application/json');
        res.send();
    });

    console.log(`Docs available at http://localhost:${port}/docs`);
}

export default swaggerDocs;
