export declare function useAIDictionary(): {
    formatting_toolbar: {
        ai: {
            tooltip: string;
            input_placeholder: string;
        };
    };
    slash_menu: {
        ai_block: {
            title: string;
            subtext: string;
            aliases: string[];
            group: string;
        };
        ai: {
            title: string;
            subtext: string;
            aliases: string[];
            group: string;
        };
    };
    placeholders: {
        ai: string;
    };
    ai_menu: {
        continue_writing: {
            title: string;
            aliases: undefined;
        };
        summarize: {
            title: string;
            aliases: undefined;
        };
        add_action_items: {
            title: string;
            aliases: undefined;
        };
        write_anything: {
            title: string;
            aliases: undefined;
            prompt_placeholder: string;
        };
        make_longer: {
            title: string;
            aliases: undefined;
        };
        make_shorter: {
            title: string;
            aliases: undefined;
        };
        rewrite: {
            title: string;
            aliases: undefined;
        };
        simplify: {
            title: string;
            aliases: undefined;
        };
        translate: {
            title: string;
            aliases: undefined;
            prompt_placeholder: string;
        };
        fix_spelling: {
            title: string;
            aliases: undefined;
        };
        improve_writing: {
            title: string;
            aliases: undefined;
        };
        accept: {
            title: string;
            aliases: undefined;
        };
        retry: {
            title: string;
            aliases: undefined;
        };
        revert: {
            title: string;
            aliases: undefined;
        };
    };
    ai_block_toolbar: {
        show_prompt: string;
        show_prompt_datetime_tooltip: string;
        update: string;
        updating: string;
    };
    ai_inline_toolbar: {
        accept: string;
        retry: string;
        updating: string;
        revert: string;
    };
};
