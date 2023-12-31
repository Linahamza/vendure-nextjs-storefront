import { useTranslation } from 'next-i18next';
import React, { useState } from 'react';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useForm } from 'react-hook-form';
import { storefrontApiMutation } from '@/src/graphql/client';
import { Stack } from '@/src/components/atoms/Stack';
import { Banner, Input } from '@/src/components/forms';
import { usePush } from '@/src/lib/redirect';
import { CustomerWrap, Form, StyledButton } from '../atoms/shared';

type ResetPasswordForm = {
    oldPassword: string;
    newPassword: string;
    newPasswordConfirmation: string;
};

export const CustomerResetPasswordForm = () => {
    const push = usePush();
    const { t } = useTranslation('customer');
    const { t: tErrors } = useTranslation('common');
    const [loading, setLoading] = useState(false);

    const passwordSchema = z
        .object({
            oldPassword: z
                .string()
                .min(8, tErrors('errors.password.minLength'))
                .max(25, tErrors('errors.password.maxLength')),
            newPassword: z
                .string()
                .min(8, tErrors('errors.password.minLength'))
                .max(25, tErrors('errors.password.maxLength')),
            newPasswordConfirmation: z
                .string()
                .min(8, tErrors('errors.password.minLength'))
                .max(25, tErrors('errors.password.maxLength')),
        })
        .refine(data => data.newPassword === data.newPasswordConfirmation, {
            message: tErrors('errors.confirmPassword.mustMatch'),
            path: ['newPasswordConfirmation'],
        })
        .refine(data => data.oldPassword !== data.newPassword, {
            message: tErrors('errors.password.mustDifferent'),
            path: ['newPassword'],
        });

    const {
        register,
        handleSubmit,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<ResetPasswordForm>({
        values: {
            oldPassword: '',
            newPassword: '',
            newPasswordConfirmation: '',
        },
        resolver: zodResolver(passwordSchema),
    });

    const onPasswordChange: SubmitHandler<ResetPasswordForm> = async data => {
        setLoading(true);
        try {
            const { updateCustomerPassword } = await storefrontApiMutation({
                updateCustomerPassword: [
                    { currentPassword: data.oldPassword, newPassword: data.newPassword },
                    {
                        __typename: true,
                        '...on InvalidCredentialsError': {
                            message: true,
                            errorCode: true,
                            authenticationError: true,
                        },
                        '...on NativeAuthStrategyError': {
                            errorCode: true,
                            message: true,
                        },
                        '...on PasswordValidationError': {
                            errorCode: true,
                            message: true,
                            validationErrorMessage: true,
                        },
                        '...on Success': {
                            success: true,
                        },
                    },
                ],
            });

            if (updateCustomerPassword.__typename !== 'Success') {
                setError('root', { message: tErrors(`errors.backend.${updateCustomerPassword.errorCode}`) });
                setLoading(false);
                return;
            }

            const { logout } = await storefrontApiMutation({ logout: { success: true } });
            if (logout.success) push('/customer/sign-in/');
        } catch (error) {
            setError('root', { message: tErrors('errors.backend.UNKNOWN_ERROR') });
            setLoading(false);
        }
    };
    return (
        <CustomerWrap
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
                type: 'spring',
                stiffness: 380,
                damping: 30,
            }}>
            <Form onSubmit={handleSubmit(onPasswordChange)} noValidate>
                <Banner error={errors.root} clearErrors={() => clearErrors('root')} />
                <Stack column itemsCenter>
                    <Input
                        label={t('accountPage.passwordForm.oldPassword')}
                        type="password"
                        {...register('oldPassword')}
                    />
                    <Stack gap="1.25rem">
                        <Input
                            label={t('accountPage.passwordForm.newPassword')}
                            type="password"
                            {...register('newPassword')}
                        />
                        <Input
                            label={t('accountPage.passwordForm.confirmPassword')}
                            type="password"
                            {...register('newPasswordConfirmation')}
                        />
                    </Stack>
                </Stack>
                <StyledButton loading={loading} type="submit">
                    {t('accountPage.passwordForm.confirmPassword')}
                </StyledButton>
            </Form>
        </CustomerWrap>
    );
};
