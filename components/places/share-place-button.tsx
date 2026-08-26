'use client';

import { CheckIcon, CopyIcon, Share2Icon } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { ensureShareLink, revokeShareLink } from '@/app/places/actions';
import { showFlash } from '@/components/flash-toast';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface SharePlaceButtonProps {
	placeId: string;
	placeName: string;
	// Absent until the place has been shared at least once.
	shareToken?: string;
}

const COPIED_FEEDBACK_MS = 2000;

// Neither the origin nor the presence of the share sheet ever changes while
// the page is open, so there is nothing to subscribe to. Defined out here to
// keep the same function identity across renders.
const subscribeToNothing = () => () => {};

export function SharePlaceButton({
	placeId,
	placeName,
	shareToken
}: SharePlaceButtonProps) {
	const [open, setOpen] = useState(false);
	const [token, setToken] = useState(shareToken);
	const [pending, setPending] = useState(false);
	const [copied, setCopied] = useState(false);

	// Neither of these exists on the server, so each is read through a store
	// with its own server snapshot. Reading `window` during render instead
	// would hydrate a different dialog than the one the server sent.
	const origin = useSyncExternalStore(
		subscribeToNothing,
		() => window.location.origin,
		() => ''
	);
	const canShare = useSyncExternalStore(
		subscribeToNothing,
		() => typeof navigator.share === 'function',
		() => false
	);

	useEffect(() => {
		if (!copied) {
			return;
		}

		const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
		return () => clearTimeout(timer);
	}, [copied]);

	const url = token && origin ? `${origin}/s/${token}` : '';

	// The token is minted when the dialog opens, not when the user asks to
	// share. By the time they reach the buttons inside it the link already
	// exists, so navigator.share runs in its own click and never loses the
	// user gesture to an awaited round trip — Safari rejects the share
	// otherwise.
	const handleOpenChange = async (nextOpen: boolean) => {
		setOpen(nextOpen);

		if (!nextOpen || token || pending) {
			return;
		}

		setPending(true);
		const result = await ensureShareLink(placeId);
		setPending(false);

		if (!result.ok) {
			showFlash('share-link-error');
			setOpen(false);
			return;
		}

		setToken(result.token);
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			showFlash('share-link-copied');
		} catch (err) {
			console.error('[share-place] no se ha podido copiar:', err);
			showFlash('share-link-error');
		}
	};

	const handleShare = async () => {
		try {
			await navigator.share({ url });
		} catch (error) {
			// Closing the sheet without picking anything rejects with
			// AbortError. That is the user saying no, not a failure.
			if (error instanceof DOMException && error.name === 'AbortError') {
				return;
			}

			console.error('[share-place] no se ha podido compartir:', error);
			showFlash('share-link-error');
		}
	};

	const handleRevoke = async () => {
		setPending(true);
		const result = await revokeShareLink(placeId);
		setPending(false);

		if (!result.ok) {
			showFlash('share-link-error');
			return;
		}

		setToken(undefined);
		setOpen(false);
		showFlash('share-link-revoked');
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger
				render={
					<Button variant="outline">
						<Share2Icon />
						Compartir
					</Button>
				}
			/>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Compartir «{placeName}»</DialogTitle>
					<DialogDescription>
						Cualquiera con el enlace verá la ubicación, los
						teléfonos, la web y las fotos. Tus notas no se
						comparten.
					</DialogDescription>
				</DialogHeader>

				{url ? (
					<div className="flex gap-2">
						<Input
							readOnly
							value={url}
							// Tapping the field selects the whole link, so it can
							// still be copied by hand where the clipboard API is
							// blocked.
							onFocus={event => event.currentTarget.select()}
							className="font-mono text-xs"
						/>
						<Button
							variant="outline"
							size="icon"
							onClick={handleCopy}
							aria-label="Copiar enlace"
						>
							{copied ? <CheckIcon /> : <CopyIcon />}
						</Button>
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						Generando enlace…
					</p>
				)}

				<DialogFooter>
					{token && (
						<Button
							variant="destructive"
							onClick={handleRevoke}
							disabled={pending}
						>
							Dejar de compartir
						</Button>
					)}

					{canShare && url && (
						<Button onClick={handleShare}>
							<Share2Icon />
							Compartir…
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
