declare module 'sib-api-v3-sdk' {
    export default SibApiV3Sdk;

    namespace SibApiV3Sdk {
        class TransactionalEmailsApi {
            constructor();
            sendTransacEmail(emailData: any): Promise<any>;
        }

        class ContactsApi {
            constructor();
            createContact(contactData: any): Promise<any>;
            updateContact(identifier: string, contactData: any): Promise<any>;
        }

        namespace ApiClient {
            namespace instance {
                const authentications: {
                    'api-key': {
                        apiKey: string;
                    };
                };
            }
        }
    }
}
