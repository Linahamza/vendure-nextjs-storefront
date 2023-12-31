import { Layout } from '@/src/layouts';
import { makeServerSideProps, prepareSSRRedirect } from '@/src/lib/getStatic';
import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import React from 'react';
import { getCollections } from '@/src/graphql/sharedQueries';
import { CustomerNavigation } from './components/CustomerNavigation';
import { SSRQuery } from '@/src/graphql/client';
import { ActiveCustomerSelector, ActiveOrderSelector } from '@/src/graphql/selectors';
import { CustomerForm } from './components/CustomerForm';
import { ContentContainer } from '@/src/components/atoms/ContentContainer';
import { SortOrder } from '@/src/zeus';
import { Stack } from '@/src/components';
import { arrayToTree } from '@/src/util/arrayToTree';
import { useTranslation } from 'next-i18next';
import styled from '@emotion/styled';

const Account: React.FC<InferGetServerSidePropsType<typeof getServerSideProps>> = props => {
    const { t } = useTranslation('customer');
    return (
        <Layout categories={props.collections} navigation={props.navigation} pageTitle={t('accountPage.title')}>
            <ContentContainer>
                <CustomerWrap itemsStart w100 gap="3rem">
                    <CustomerNavigation />
                    <CustomerForm initialCustomer={props.activeCustomer} order={props.lastOrder} />
                </CustomerWrap>
            </ContentContainer>
        </Layout>
    );
};

const CustomerWrap = styled(Stack)`
    padding: 2rem 0;

    @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
        flex-direction: column;
    }
`;

const getServerSideProps = async (context: GetServerSidePropsContext) => {
    const r = await makeServerSideProps(['common', 'customer'])(context);
    const collections = await getCollections();
    const navigation = arrayToTree(collections);
    const homePageRedirect = prepareSSRRedirect('/')(context);

    try {
        const { activeCustomer } = await SSRQuery(context)({
            activeCustomer: {
                ...ActiveCustomerSelector,
                orders: [
                    { options: { take: 1, sort: { updatedAt: SortOrder.DESC }, filter: { active: { eq: false } } } },
                    { items: ActiveOrderSelector },
                ],
            },
        });
        if (!activeCustomer) throw new Error('No active customer');

        const { orders, ...customer } = activeCustomer;

        const returnedStuff = {
            ...r.props,
            collections,
            activeCustomer: customer,
            lastOrder: orders.items && orders.items.length > 0 ? orders.items[0] : null,
            navigation,
        };

        return { props: returnedStuff };
    } catch (error) {
        return homePageRedirect;
    }
};

export { getServerSideProps };
export default Account;
