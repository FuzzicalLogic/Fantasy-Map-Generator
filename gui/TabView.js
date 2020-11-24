export const TabView = el => {
    let buttons = () => el.querySelector('.tab');
    let contents = () => el.querySelectorAll('.tabcontent');

    buttons().addEventListener('click', ({ target }) => {
        let prev = el.querySelector('.tab > .active');
        if (prev === target) return;

        if (prev)
            prev.classList.remove('active');
        target.classList.add('active');

        let idx = Array.from(buttons().children).indexOf(target);
        contents().forEach(hide);
        show(contents()[idx]);
    })
}

const hide = el => el.setAttribute('hidden', '');
const show = el => el.removeAttribute('hidden');