import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useIsDemo() {
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkDemo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsDemo(false);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_demo')
          .eq('id', user.id)
          .single();

        setIsDemo(profile?.is_demo === true);
      } catch {
        setIsDemo(false);
      } finally {
        setLoading(false);
      }
    };

    checkDemo();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkDemo();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isDemo, loading };
}
